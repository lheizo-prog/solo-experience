package com.soloforge.gemini.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@Slf4j
public class GeminiService {

    @Value("${gemini.api.key:}")
    private String apiKey;

    @Value("${gemini.api.model:gemini-2.5-flash}")
    private String primaryModel;

    @Value("${gemini.api.url:https://generativelanguage.googleapis.com/v1beta/models}")
    private String baseUrl;

    private static final List<String> FALLBACK_MODELS = List.of(
            "gemini-flash-latest",
            "gemini-pro-latest",
            "gemini-2.5-flash",
            "gemini-2.0-flash"
    );

    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final List<String> discoveredModelsCache = new ArrayList<>();
    private long lastDiscoveryTime = 0;

    public GeminiService() {
        this.restClient = RestClient.builder().build();
        this.objectMapper = new ObjectMapper();
    }

    /**
     * Consulta a API do Google (ListModels) para descobrir modelos que suportam 'generateContent'
     */
    private synchronized List<String> discoverSupportedModels() {
        // Cache válido por 1 hora
        long now = System.currentTimeMillis();
        if (!discoveredModelsCache.isEmpty() && (now - lastDiscoveryTime < 3600_000)) {
            return new ArrayList<>(discoveredModelsCache);
        }

        if (apiKey == null || apiKey.isBlank()) {
            return Collections.emptyList();
        }

        try {
            String listEndpoint = String.format("%s?key=%s", baseUrl, apiKey);
            String responseJson = restClient.get()
                    .uri(listEndpoint)
                    .retrieve()
                    .body(String.class);

            JsonNode root = objectMapper.readTree(responseJson);
            JsonNode modelsNode = root.path("models");
            if (modelsNode.isArray()) {
                List<String> validModels = new ArrayList<>();
                for (JsonNode m : modelsNode) {
                    JsonNode methods = m.path("supportedGenerationMethods");
                    boolean supportsGenerate = false;
                    if (methods.isArray()) {
                        for (JsonNode method : methods) {
                            if ("generateContent".equalsIgnoreCase(method.asText())) {
                                supportsGenerate = true;
                                break;
                            }
                        }
                    }
                    if (supportsGenerate) {
                        String name = m.path("name").asText(); // ex: "models/gemini-2.5-flash"
                        if (name.startsWith("models/")) {
                            name = name.substring("models/".length());
                        }
                        validModels.add(name);
                    }
                }

                if (!validModels.isEmpty()) {
                    discoveredModelsCache.clear();
                    discoveredModelsCache.addAll(validModels);
                    lastDiscoveryTime = now;
                    log.info("Modelos Gemini descobertos com sucesso para esta chave: {}", validModels);
                    return validModels;
                }
            }
        } catch (Exception e) {
            log.warn("Não foi possível listar modelos dinamicamente via ListModels: {}. Usando lista padrão.", e.getMessage());
        }

        return Collections.emptyList();
    }

    /**
     * Retorna a lista ordenada de modelos a tentar (modelo configurado primeiro, modelos descobertos, seguido de fallbacks)
     */
    private List<String> getCandidateModels() {
        List<String> candidates = new ArrayList<>();
        if (primaryModel != null && !primaryModel.isBlank()) {
            candidates.add(primaryModel.trim());
        }

        // Adiciona modelos descobertos da própria conta/chave do usuário
        List<String> discovered = discoverSupportedModels();
        for (String m : discovered) {
            if (!candidates.contains(m)) {
                candidates.add(m);
            }
        }

        // Adiciona aliases e fallbacks modernos conhecidos
        for (String m : FALLBACK_MODELS) {
            if (!candidates.contains(m)) {
                candidates.add(m);
            }
        }
        return candidates;
    }

    /**
     * Gera resposta com base no system instruction (Bíblia + Regras + Contexto) e nas mensagens de chat
     */
    public String generateStoryResponse(String systemInstruction, List<Map<String, String>> chatHistory) {
        if (apiKey == null || apiKey.isBlank()) {
            return "[Modo Offline/Sem Chave de API]: O Mestre observa a taverna silenciosa. (Configure sua GEMINI_API_KEY no backend para ativar as narrações mágicas da IA!)";
        }

        Map<String, Object> requestBody = new HashMap<>();

        // System instruction
        if (systemInstruction != null && !systemInstruction.isBlank()) {
            requestBody.put("system_instruction", Map.of(
                    "parts", List.of(Map.of("text", systemInstruction))
            ));
        }

        // Contents (histórico e mensagens)
        List<Map<String, Object>> contents = new ArrayList<>();
        for (Map<String, String> msg : chatHistory) {
            String role = "PLAYER".equalsIgnoreCase(msg.get("role")) ? "user" : "model";
            contents.add(Map.of(
                    "role", role,
                    "parts", List.of(Map.of("text", msg.get("text")))
            ));
        }
        requestBody.put("contents", contents);

        Exception lastException = null;
        for (String modelToTry : getCandidateModels()) {
            try {
                String endpoint = String.format("%s/%s:generateContent?key=%s", baseUrl, modelToTry, apiKey);

                String responseJson = restClient.post()
                        .uri(endpoint)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(requestBody)
                        .retrieve()
                        .body(String.class);

                JsonNode root = objectMapper.readTree(responseJson);
                JsonNode candidate = root.path("candidates").get(0);
                if (candidate != null) {
                    JsonNode parts = candidate.path("content").path("parts");
                    if (parts.isArray() && !parts.isEmpty()) {
                        log.info("Gemini respondeu com sucesso usando o modelo: {}", modelToTry);
                        String rawText = parts.get(0).path("text").asText();
                        return extractPlayerNarrative(rawText);
                    }
                }
                return "O Mestre permanece em silêncio contemplando o destino...";
            } catch (Exception e) {
                lastException = e;
                log.warn("Tentativa com modelo Gemini [{}] falhou: {}. Tentando próximo modelo...", modelToTry, e.getMessage());
            }
        }

        log.error("Todos os modelos candidatos do Gemini falharam", lastException);
        return "Erro ao contatar o oráculo do Gemini: " + (lastException != null ? lastException.getMessage() : "Nenhum modelo respondeu");
    }

    /**
     * Extrai cirurgicamente a narração oficial destinada ao jogador, descartando qualquer
     * scratchpad/pensamento interno, rascunho de bastidores ou checklist de auto-revisão.
     */
    public static String extractPlayerNarrative(String rawResponse) {
        if (rawResponse == null || rawResponse.isBlank()) {
            return "";
        }

        // 1. Tenta extrair o bloco estritamente delimitado por <narrativa>...</narrativa>
        Pattern xmlPattern = Pattern.compile("<narrativa>([\\s\\S]*?)(?:</narrativa>|$)", Pattern.CASE_INSENSITIVE);
        Matcher xmlMatcher = xmlPattern.matcher(rawResponse);
        if (xmlMatcher.find()) {
            String narrative = xmlMatcher.group(1).trim();
            if (!narrative.isEmpty()) {
                return narrative;
            }
        }

        // 2. Tenta extrair variação entre colchetes [NARRATIVA]...[/NARRATIVA]
        Pattern bracketPattern = Pattern.compile("\\[NARRATIVA\\]([\\s\\S]*?)(?:\\[/NARRATIVA\\]|$)", Pattern.CASE_INSENSITIVE);
        Matcher bracketMatcher = bracketPattern.matcher(rawResponse);
        if (bracketMatcher.find()) {
            String narrative = bracketMatcher.group(1).trim();
            if (!narrative.isEmpty()) {
                return narrative;
            }
        }

        // 3. Fallback inteligente: se a IA não utilizou as tags delimitadoras, limpa rascunhos conhecidos
        String cleaned = rawResponse;

        // Se houver marcador de início da cena (Drafting response:, Cena:, etc.)
        Pattern startPattern = Pattern.compile("(?i)(\\*(?:Drafting response|Cena|A Cena|Narrativa)\\*|\\b(?:Drafting response|Cena|Narrativa):\\s*)");
        Matcher startMatcher = startPattern.matcher(cleaned);
        if (startMatcher.find() && startMatcher.start() > 20) {
            cleaned = cleaned.substring(startMatcher.end()).trim();
        }

        // Se houver marcador de checklist de encerramento (Check against rules:, Final Polish, etc.)
        Pattern endPattern = Pattern.compile("(?i)(\\*(?:Check against rules|Final Polish|Auto-correção|Self-correction)\\*|\\b(?:Check against rules|Notes):)");
        Matcher endMatcher = endPattern.matcher(cleaned);
        if (endMatcher.find()) {
            cleaned = cleaned.substring(0, endMatcher.start()).trim();
        }

        return cleaned;
    }

    /**
     * Chamada direta para geração de texto/JSON sem histórico
     */
    public String generateContent(String systemInstruction, String userPrompt) {
        if (apiKey == null || apiKey.isBlank()) {
            return "";
        }

        Map<String, Object> requestBody = new HashMap<>();
        if (systemInstruction != null && !systemInstruction.isBlank()) {
            requestBody.put("system_instruction", Map.of(
                    "parts", List.of(Map.of("text", systemInstruction))
            ));
        }

        requestBody.put("contents", List.of(Map.of(
                "role", "user",
                "parts", List.of(Map.of("text", userPrompt))
        )));

        for (String modelToTry : getCandidateModels()) {
            try {
                String endpoint = String.format("%s/%s:generateContent?key=%s", baseUrl, modelToTry, apiKey);

                String responseJson = restClient.post()
                        .uri(endpoint)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(requestBody)
                        .retrieve()
                        .body(String.class);

                JsonNode root = objectMapper.readTree(responseJson);
                JsonNode candidate = root.path("candidates").get(0);
                if (candidate != null) {
                    JsonNode parts = candidate.path("content").path("parts");
                    if (parts.isArray() && !parts.isEmpty()) {
                        return parts.get(0).path("text").asText();
                    }
                }
                return "";
            } catch (Exception e) {
                log.warn("Tentativa de generateContent com modelo [{}] falhou: {}. Tentando próximo...", modelToTry, e.getMessage());
            }
        }

        log.error("Todos os modelos candidatos falharam em generateContent");
        return "";
    }
}

