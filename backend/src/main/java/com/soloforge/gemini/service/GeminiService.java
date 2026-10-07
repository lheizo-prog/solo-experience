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

        // Generation config (calibração de criatividade, foco narrativo e concisão)
        requestBody.put("generationConfig", Map.of(
                "temperature", 0.8,
                "topP", 0.95,
                "topK", 40,
                "maxOutputTokens", 1024
        ));

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
     * scratchpad/pensamento interno, rascunho de bastidores ou checklist de auto-revisão,
     * mesmo que tenham vazado para dentro das tags ou aparecido desordenadamente.
     */
    public static String extractPlayerNarrative(String rawResponse) {
        if (rawResponse == null || rawResponse.isBlank()) {
            return "";
        }

        String cleaned = rawResponse;

        // 1. Remove qualquer bloco de pensamento formalmente declarado
        cleaned = cleaned.replaceAll("(?is)<pensamento>.*?</pensamento>", "");
        cleaned = cleaned.replaceAll("(?is)<scratchpad>.*?</scratchpad>", "");
        cleaned = cleaned.replaceAll("(?is)\\[PENSAMENTO\\].*?\\[/PENSAMENTO\\]", "");

        // 2. Tenta extrair o bloco estritamente delimitado por <narrativa>...</narrativa>
        Pattern xmlPattern = Pattern.compile("(?is)<narrativa>([\\s\\S]*?)(?:</narrativa>|$)");
        Matcher xmlMatcher = xmlPattern.matcher(cleaned);
        if (xmlMatcher.find()) {
            String narrative = xmlMatcher.group(1).trim();
            if (!narrative.isEmpty()) {
                cleaned = narrative;
            }
        } else {
            // Tenta variação entre colchetes [NARRATIVA]...[/NARRATIVA]
            Pattern bracketPattern = Pattern.compile("(?is)\\[NARRATIVA\\]([\\s\\S]*?)(?:\\[/NARRATIVA\\]|$)");
            Matcher bracketMatcher = bracketPattern.matcher(cleaned);
            if (bracketMatcher.find()) {
                String narrative = bracketMatcher.group(1).trim();
                if (!narrative.isEmpty()) {
                    cleaned = narrative;
                }
            }
        }

        // 3. Higienização de Resíduos: Se a IA incluiu cabeçalhos de início de rascunho
        // Ex: "*Drafting response:*", "*Draft:*", "**Drafting response:**", "*Cena:*", "*A Cena:*"
        Pattern startMarkerPattern = Pattern.compile("(?im)^\\s*(?:\\*+Drafting response:?\\*+|\\*+Draft:?\\*+|\\*+Cena:?\\*+|\\*+A Cena:?\\*+|Drafting response:|Cena:)\\s*\\n?");
        Matcher startMarkerMatcher = startMarkerPattern.matcher(cleaned);
        if (startMarkerMatcher.find()) {
            cleaned = cleaned.substring(startMarkerMatcher.end()).trim();
        }

        // 4. Higienização de linhas iniciais de metalinguagem / pensamento em tópicos
        // Ex: "* O ambiente deve ser...", "* Sem notas de bastidores.", "*(Decisão do Mestre)*:", "* Shonen/Seinen..."
        cleaned = sanitizeLeadingThoughtBullets(cleaned);

        // 5. Higienização de Checklists e notas de rodapé / encerramento
        // Ex: "*Check against rules*", "*Final Polish*", "Self-correction:", "Notas de bastidores:"
        Pattern endPattern = Pattern.compile("(?im)^\\s*(?:\\*+(?:Check against rules|Final Polish|Auto-correção|Self-correction|Notas de bastidores)\\*+|Check against rules:|Notes:).*$");
        Matcher endMatcher = endPattern.matcher(cleaned);
        if (endMatcher.find()) {
            cleaned = cleaned.substring(0, endMatcher.start()).trim();
        }

        return cleaned.trim();
    }

    /**
     * Remove linhas ou parágrafos iniciais que sejam metalinguagem de bastidores,
     * como diretrizes de tom ou listas de intenções narrativas que vazaram antes da prosa real.
     */
    private static String sanitizeLeadingThoughtBullets(String text) {
        if (text == null || text.isBlank()) {
            return "";
        }

        String[] lines = text.split("\\r?\\n");
        int startIndex = 0;

        for (int i = 0; i < lines.length; i++) {
            String line = lines[i].trim();
            if (line.isEmpty()) {
                continue;
            }

            // Padrões típicos de pensamento que não pertencem à narração em 2ª pessoa
            boolean isThoughtLine = line.matches("(?i)^\\*\\s*\\*(?:Sem notas|Sem metalinguagem|Foco na imersão|Conclusão|Ajuste de tom|Decisão do Mestre).*")
                    || line.matches("(?i)^\\*\\s*\\(?(?:Decisão do Mestre|Ajuste de tom|Tom|Objetivo|Conexão com o personagem|O ambiente deve ser)\\)?.*")
                    || line.matches("(?i)^\\*?\\s*\\(?(?:Decisão do Mestre|Drafting response)\\)?.*")
                    || line.matches("(?i)^\\*\\s*(?:Shonen|Seinen|Grimdark|O tom deve ser|O objetivo d[eo]|O ambiente deve).*");

            if (isThoughtLine) {
                startIndex = i + 1;
            } else {
                // Se encontramos uma linha normal da história, interrompemos
                break;
            }
        }

        if (startIndex > 0 && startIndex < lines.length) {
            StringBuilder sb = new StringBuilder();
            for (int i = startIndex; i < lines.length; i++) {
                sb.append(lines[i]).append("\n");
            }
            return sb.toString().trim();
        }

        return text;
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

