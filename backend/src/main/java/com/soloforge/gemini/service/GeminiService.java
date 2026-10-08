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

        // Generation config: sem estrangulamento de tokens (teto máximo de 65536 para suportar raciocínio profundo e narração completa)
        Map<String, Object> baseGenConfig = new HashMap<>();
        baseGenConfig.put("temperature", 0.8);
        baseGenConfig.put("topP", 0.95);
        baseGenConfig.put("topK", 40);
        baseGenConfig.put("maxOutputTokens", 65536);

        Exception lastException = null;
        for (String modelToTry : getCandidateModels()) {
            try {
                String endpoint = String.format("%s/%s:generateContent?key=%s", baseUrl, modelToTry, apiKey);

                Map<String, Object> currentGenConfig = new HashMap<>(baseGenConfig);
                // Permite raciocínio profundo e ilimitado para modelos compatíveis com thinking
                if (modelToTry.contains("2.5") || modelToTry.contains("2.0")) {
                    currentGenConfig.put("thinkingConfig", Map.of("thinkingBudget", -1));
                }
                requestBody.put("generationConfig", currentGenConfig);

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
                        log.debug("Gemini Raw Response: {}", rawText);

                        // Avaliação Precisa: Verificar se a resposta é puramente pensamento/brainstorm sem prosa efetiva
                        if (isPureThoughtLeak(rawText)) {
                            log.warn("Detectado vazamento de pensamento puro sem narrativa para o jogador no modelo [{}]. Solicitando reformulação imediata...", modelToTry);
                            String reformulated = requestReformulation(systemInstruction, rawText, modelToTry);
                            if (reformulated != null && !reformulated.isBlank() && !isPureThoughtLeak(reformulated)) {
                                String cleanReformulated = extractPlayerNarrative(reformulated);
                                if (isValidPlayerNarrative(cleanReformulated)) {
                                    log.info("Gemini reformulou com sucesso em prosa oficial para o jogador!");
                                    return cleanReformulated;
                                }
                            }
                            log.warn("Tentativa de reformulação falhou ou repetiu pensamento. Extraindo melhor esforço ou tentando próximo modelo...");
                        }

                        String extracted = extractPlayerNarrative(rawText);
                        if (isValidPlayerNarrative(extracted)) {
                            return extracted;
                        }

                        // Se ficou inválido ou vazio, tenta reformular antes de pular para o próximo modelo candidato
                        String retryText = requestReformulation(systemInstruction, rawText, modelToTry);
                        if (retryText != null && !retryText.isBlank()) {
                            String retryExtracted = extractPlayerNarrative(retryText);
                            if (isValidPlayerNarrative(retryExtracted)) {
                                return retryExtracted;
                            }
                        }
                    }
                }
                log.warn("Modelo [{}] retornou resposta sem narrativa válida para o jogador. Tentando próximo modelo candidato...", modelToTry);
            } catch (Exception e) {
                lastException = e;
                log.warn("Tentativa com modelo Gemini [{}] falhou: {}. Tentando próximo modelo...", modelToTry, e.getMessage());
            }
        }

        if (lastException != null) {
            log.error("Todos os modelos candidatos do Gemini falharam com exceção de conexão/API", lastException);
            return "Erro ao contatar o oráculo do Gemini: " + lastException.getMessage();
        }

        log.warn("Todos os modelos candidatos responderam sem narrativa válida. Usando salvaguarda de continuidade.");
        return "O Mestre aguarda sua decisão. O que você faz a seguir?";
    }

    /**
     * Extrai cirurgicamente a narração oficial destinada ao jogador, descartando qualquer
     * scratchpad/pensamento interno, rascunhos múltiplos de bastidores, repetição de fichas
     * ou checklist de auto-revisão, mesmo que tenham vazado em markdown livre sem tags XML.
     */
    public static String extractPlayerNarrative(String rawResponse) {
        if (rawResponse == null || rawResponse.isBlank()) {
            return "";
        }

        // Estágio 1: Desempacotar cercas de bloco de código (ex: ```xml ... ``` ou ```markdown ... ```)
        String cleaned = stripCodeFences(rawResponse);

        // Estágio 2: Remover blocos formais de pensamento conhecidos
        cleaned = stripThoughtBlocks(cleaned);

        // Estágio 3: Extrair bloco oficial por tags (<narrativa> ou [NARRATIVA] ou <story>) se presente
        Pattern xmlPattern = Pattern.compile("(?is)<narrativa>([\\s\\S]*?)(?:</narrativa>|$)");
        Matcher xmlMatcher = xmlPattern.matcher(cleaned);
        if (xmlMatcher.find()) {
            cleaned = xmlMatcher.group(1).trim();
            // Mesmo dentro de <narrativa>, se a IA colocou múltiplos rascunhos (*Drafting response:*), extrai o último
            cleaned = extractFromLastNarrativeMarker(cleaned);
        } else {
            Pattern bracketPattern = Pattern.compile("(?is)\\[NARRATIVA\\]([\\s\\S]*?)(?:\\[/NARRATIVA\\]|$)");
            Matcher bracketMatcher = bracketPattern.matcher(cleaned);
            if (bracketMatcher.find()) {
                cleaned = bracketMatcher.group(1).trim();
                cleaned = extractFromLastNarrativeMarker(cleaned);
            } else {
                Pattern storyPattern = Pattern.compile("(?is)<story>([\\s\\S]*?)(?:</story>|$)");
                Matcher storyMatcher = storyPattern.matcher(cleaned);
                if (storyMatcher.find()) {
                    cleaned = storyMatcher.group(1).trim();
                    cleaned = extractFromLastNarrativeMarker(cleaned);
                } else {
                    // Sem tags XML: procurar pelo ÚLTIMO marcador narrativo explícito
                    cleaned = extractFromLastNarrativeMarker(cleaned);
                }
            }
        }

        // Estágio 4: Higienização de Cabeçalho / Preâmbulo (Prefix Clutter)
        cleaned = sanitizeLeadingHeadersAndBullets(cleaned);

        // Estágio 5: Higienização de Rodapé / Monólogo Pós-Narrativa (Suffix Clutter)
        cleaned = sanitizeTrailingMonologueAndChecklists(cleaned);

        String finalResult = cleaned.trim();

        // Estágio 6: Salvaguarda Anti-Vazio
        if (finalResult.isEmpty()) {
            String fallback = stripThoughtBlocks(rawResponse)
                    .replaceAll("(?is)</?(?:narrativa|scratchpad|story|pensamento|thought)>", "").trim();
            if (!fallback.isEmpty()) {
                return fallback;
            }
            return "O Mestre aguarda sua decisão. O que você faz a seguir?";
        }

        return finalResult;
    }

    private static String stripCodeFences(String text) {
        if (text == null) return "";
        String trimmed = text.trim();
        if (trimmed.startsWith("```")) {
            trimmed = trimmed.replaceFirst("^```(?:xml|html|markdown|text)?\\r?\\n?", "");
            trimmed = trimmed.replaceFirst("\\r?\\n?```$", "");
        }
        return trimmed.trim();
    }

    private static String stripThoughtBlocks(String text) {
        if (text == null) return "";
        String cleaned = text;
        cleaned = cleaned.replaceAll("(?is)<pensamento>.*?</pensamento>", "");
        cleaned = cleaned.replaceAll("(?is)<thought>.*?</thought>", "");
        cleaned = cleaned.replaceAll("(?is)<reasoning>.*?</reasoning>", "");
        cleaned = cleaned.replaceAll("(?is)<scratchpad>.*?</scratchpad>", "");
        cleaned = cleaned.replaceAll("(?is)\\[PENSAMENTO\\].*?\\[/PENSAMENTO\\]", "");
        cleaned = cleaned.replaceAll("(?is)\\[THOUGHT\\].*?\\[/THOUGHT\\]", "");
        cleaned = cleaned.replaceAll("(?is)\\[REASONING\\].*?\\[/REASONING\\]", "");

        // Tag aberta de pensamento sem fechamento estrito seguida por bloco de narrativa
        cleaned = cleaned.replaceAll("(?is)<(?:pensamento|thought|reasoning|scratchpad)>[\\s\\S]*?(?=<narrativa>|\\[NARRATIVA\\]|<story>)", "");
        return cleaned;
    }

    private static String extractFromLastNarrativeMarker(String text) {
        if (text == null || text.isBlank()) return "";

        // Casamento tolerante para marcadores de narrativa, aceitando qualquer combinação de asteriscos, itálicos e traços
        // Ex: *Drafting response:*, * *Drafting Narrative:*, **Narrativa:**, *Resultado Final:*, *A Cena:*, etc.
        Pattern markerPattern = Pattern.compile("(?im)^\\s*(?:[*-]\\s*)*(?:\\*{1,2}|_{1,2}|#{1,4}\\s*)?(?:Drafting response|Drafting Narrative|Draft Narrative|Drafting Story|Drafting Narrativa|Resultado Final|Cena Final|Narrativa|A Cena|Cena|Draft)[:*_]*\\s*(?:\\r?\\n|$)");
        Matcher matcher = markerPattern.matcher(text);

        int lastMatchEnd = -1;
        while (matcher.find()) {
            lastMatchEnd = matcher.end();
        }

        if (lastMatchEnd != -1) {
            String candidate = text.substring(lastMatchEnd).trim();
            // Desindenta se o bloco de texto capturado tiver sido gerado com indentação de 2 a 4 espaços por ser filho de bullet
            candidate = candidate.replaceAll("(?m)^ {2,4}", "");
            return candidate.trim();
        }

        return text;
    }

    private static String sanitizeLeadingHeadersAndBullets(String text) {
        if (text == null || text.isBlank()) return "";

        String[] lines = text.split("\\r?\\n");
        int startIndex = 0;

        for (int i = 0; i < lines.length; i++) {
            String line = lines[i].trim();
            if (line.isEmpty()) {
                continue;
            }

            boolean isCharacterHeader = line.matches("(?i)^[A-ZÀ-Úa-zà-ú\\s]+\\s*\\([A-ZÀ-Úa-zà-ú\\s,0-9.m-]+\\)\\.?$")
                    || line.matches("(?i)^(?:FOR|KI|VEL|RES|ESP|DES|CON|INT|SAB|CAR|HP|PM|PV)\\s*\\d+.*")
                    || line.matches("(?i)^.*?\\[ROLAGEM(?: LIVRE)?\\]\\s*de\\s*d\\d+.*");

            boolean isThoughtBullet = line.matches("(?i)^[*-]\\s*.*") || line.matches("^\\d+\\.\\s*.*");
            boolean hasThoughtKeywords = line.matches("(?i)^.*?(?:sistema|d20|d100|atributo|dt|dificuldade|interpretação narrativa|sucesso|ressalva|consequência|conclusão|pensamento interno|drafting|check de regras|final polish|shonen|seinen|grimdark|decisão do mestre|ajuste de tom|foco na imersão|sem notas|sem metalinguagem|o ambiente deve|o objetivo|let's refine).*");

            boolean isSelfTalk = line.matches("(?i)^\\*?\\s*\\(?(?:Wait|Wait,|Let's|Looking at|The player|I should|I will|Final check).*\\)?\\*?");

            if (isCharacterHeader || (isThoughtBullet && hasThoughtKeywords) || isSelfTalk) {
                startIndex = i + 1;
            } else {
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

    private static String sanitizeTrailingMonologueAndChecklists(String text) {
        if (text == null || text.isBlank()) return "";

        // 1. Extrair e guardar tags essenciais ([PEDIR_TESTE: ...] e [DICAS_DE_ACAO: ...]) para reanexar depois
        List<String> preservedDiceTags = new ArrayList<>();
        Matcher diceMatcher = Pattern.compile("\\[PEDIR_TESTE:[^\\]]+\\]").matcher(text);
        while (diceMatcher.find()) {
            preservedDiceTags.add(diceMatcher.group());
        }

        List<String> preservedHintTags = new ArrayList<>();
        Matcher hintMatcher = Pattern.compile("\\[DICAS_DE_ACAO:[^\\]]+\\]").matcher(text);
        while (hintMatcher.find()) {
            preservedHintTags.add(hintMatcher.group());
        }

        // 2. Se houver "O que você faz?", tudo após ela é descarte, exceto as tags já salvas
        Pattern questionPattern = Pattern.compile("(?i)O que você faz\\?");
        Matcher qMatcher = questionPattern.matcher(text);
        int lastQuestionEnd = -1;
        while (qMatcher.find()) {
            lastQuestionEnd = qMatcher.end();
        }

        if (lastQuestionEnd != -1) {
            text = text.substring(0, lastQuestionEnd);
        } else {
            // Se não houver a pergunta, corta notas de rodapé conhecidas: *Self-Correction:*, *Ending:*, etc.
            Pattern endPattern = Pattern.compile("(?im)^\\s*(?:[*-]\\s*)*(?:\\*+(?:Self-Correction|Self correction|Wait|Final check|Ready|Check against rules|Final Polish|Auto-correção|Autoavaliação|Notas de bastidores|Notas do Mestre|Nota|Observação|Ending|Decision|Tag|Mechanics)\\*+|Self-Correction:|Check against rules:|Notes:|Ending:|Decision:|Tag:|Mechanics:).*$");
            Matcher endMatcher = endPattern.matcher(text);
            if (endMatcher.find()) {
                text = text.substring(0, endMatcher.start()).trim();
            }

            // Corta blocos de checklist booleano remanescentes (ex: "2nd person? Yes.", "No headers? Yes.", "Concise? Yes.")
            Pattern checklistPattern = Pattern.compile("(?im)^\\s*(?:[*-]\\s*)?[a-zA-Z0-9\\s_-]+\\?\\s*(?:Yes|Sim|No|Não|Checked)\\.?\\s*$");
            String[] lines = text.split("\\r?\\n");
            int lastValidLine = lines.length;
            for (int i = lines.length - 1; i >= 0; i--) {
                String l = lines[i].trim();
                if (l.isEmpty()) continue;
                if (checklistPattern.matcher(l).matches() || l.matches("(?im)^\\s*(?:[*-]\\s*)?\\*?(?:Ending|Decision|Tag|Mechanics)\\*?:?.*$")) {
                    lastValidLine = i;
                } else {
                    break;
                }
            }
            if (lastValidLine < lines.length) {
                StringBuilder sb = new StringBuilder();
                for (int i = 0; i < lastValidLine; i++) {
                    sb.append(lines[i]).append("\n");
                }
                text = sb.toString().trim();
            }
        }

        // 3. Reanexa as tags preservadas se não estiverem presentes no texto limpo
        StringBuilder result = new StringBuilder(text.trim());
        for (String dt : preservedDiceTags) {
            if (!result.toString().contains(dt)) {
                result.append("\n").append(dt);
            }
        }
        for (String ht : preservedHintTags) {
            if (!result.toString().contains(ht)) {
                result.append("\n").append(ht);
            }
        }

        return result.toString().trim();
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

    /**
     * Avaliador de Precisão Semântica: Detecta se a resposta é PENSAMENTO PURO da IA
     * sem nenhuma prosa viva dirigida ao jogador, evitando falsos positivos.
     * Retorna true APENAS se preencher os critérios cumulativos de brainstorm técnico.
     */
    public static boolean isPureThoughtLeak(String rawResponse) {
        if (rawResponse == null || rawResponse.isBlank()) {
            return false;
        }

        String cleaned = stripCodeFences(rawResponse).trim();

        // 1. Se contém tag explícita <narrativa>, [NARRATIVA] ou <story> com texto substancial, NÃO é vazamento puro
        Pattern xmlPattern = Pattern.compile("(?is)<narrativa>([\\s\\S]*?)(?:</narrativa>|$)");
        Matcher xmlMatcher = xmlPattern.matcher(cleaned);
        if (xmlMatcher.find() && xmlMatcher.group(1).trim().length() > 40) {
            return false;
        }

        Pattern bracketPattern = Pattern.compile("(?is)\\[NARRATIVA\\]([\\s\\S]*?)(?:\\[/NARRATIVA\\]|$)");
        Matcher bracketMatcher = bracketPattern.matcher(cleaned);
        if (bracketMatcher.find() && bracketMatcher.group(1).trim().length() > 40) {
            return false;
        }

        // 2. Se contém prosa viva com diálogo e pergunta de agência, NÃO é pensamento puro
        boolean hasDialogueOrQuotes = cleaned.contains("\"") || cleaned.contains("“") || cleaned.contains("”") || cleaned.matches("(?m)^\\s*—.*");
        boolean hasPlayerAgencyQuestion = Pattern.compile("(?i)O que você faz\\?").matcher(cleaned).find();
        if (hasDialogueOrQuotes && hasPlayerAgencyQuestion && cleaned.length() > 100) {
            // Verifica se a maior parte NÃO é bullet list
            String[] lines = cleaned.split("\\r?\\n");
            int bulletCount = 0;
            int totalNonEmpty = 0;
            for (String l : lines) {
                String trimmed = l.trim();
                if (!trimmed.isEmpty()) {
                    totalNonEmpty++;
                    if (trimmed.matches("^[*-]\\s*.*") || trimmed.matches("^\\d+\\.\\s*.*")) {
                        bulletCount++;
                    }
                }
            }
            if (totalNonEmpty > 0 && ((double) bulletCount / totalNonEmpty) < 0.6) {
                return false;
            }
        }

        // 3. Indicadores fortes de Brainstorm Técnico (English self-talk, checklists, fichas e rascunhos)
        int technicalIndicators = 0;

        // Auto-conversa em inglês do modelo
        if (Pattern.compile("(?im)\\b(?:Let's|Wait,|Looking at|I will|The player|The scene should|Personality:|Twist:|Ending:|Decision:)\\b").matcher(cleaned).find()) {
            technicalIndicators++;
        }

        // Checklist booleano no final (ex: "2nd person? Yes", "No headers? Yes")
        if (Pattern.compile("(?im)^\\s*(?:[*-]\\s*)?[a-zA-Z0-9\\s_-]+\\?\\s*(?:Yes|Sim|No|Não|Checked)\\.?").matcher(cleaned).find()) {
            technicalIndicators++;
        }

        // Marcadores explícitos de rascunho (ex: "*Drafting Narrative:*", "*Drafting response:*")
        if (Pattern.compile("(?im)(?:\\*Drafting|Drafting Narrative|Draft Narrative|\\*Ending:\\*|\\*Decision:\\*)").matcher(cleaned).find()) {
            technicalIndicators++;
        }

        // Repetição de ficha de personagem no início
        if (Pattern.compile("(?im)^(?:FOR|KI|VEL|RES|ESP|DES|CON|INT|SAB|CAR)\\s*\\d+").matcher(cleaned).find()) {
            technicalIndicators++;
        }

        // Proporção dominante de bullets (lista de notas)
        String[] lines = cleaned.split("\\r?\\n");
        int bulletCount = 0;
        int totalNonEmpty = 0;
        for (String l : lines) {
            String trimmed = l.trim();
            if (!trimmed.isEmpty()) {
                totalNonEmpty++;
                if (trimmed.matches("^[*-]\\s*.*") || trimmed.matches("^\\d+\\.\\s*.*")) {
                    bulletCount++;
                }
            }
        }

        boolean mostlyBullets = totalNonEmpty > 0 && ((double) bulletCount / totalNonEmpty) >= 0.6;
        if (mostlyBullets) {
            technicalIndicators++;
        }

        // Considera Pensamento Puro apenas se houver pelo menos 2 indicadores técnicos claros e predominância de notas
        return technicalIndicators >= 2;
    }

    /**
     * Solicita reformulação imediata ao Gemini quando um vazamento de pensamento é detectado,
     * reaproveitando o raciocínio rico já gerado e exigindo a narrativa oficial em prosa viva.
     */
    private String requestReformulation(String systemInstruction, String rawDraft, String modelToUse) {
        if (apiKey == null || apiKey.isBlank() || rawDraft == null || rawDraft.isBlank()) {
            return null;
        }

        try {
            String endpoint = String.format("%s/%s:generateContent?key=%s", baseUrl, modelToUse, apiKey);

            String reformulationPrompt = """
                [ALERTA DO SISTEMA - AUTO-CORREÇÃO DE PROTOCOLO]:
                Você realizou o raciocínio de regras, DT e intenção dramática, mas NÃO entregou a cena narrativa para o jogador.
                
                Com base no seu raciocínio prévio:
                \"\"\"
                %s
                \"\"\"
                
                Escreva AGORA a prosa narrativa oficial dirigida ao jogador em 2ª pessoa ('Você...'), em português, dentro de:
                <narrativa>
                (Sua prosa viva, imersiva, diálogos dos personagens, encerrando com 'O que você faz?' e a tag [PEDIR_TESTE: ...] se cabível)
                </narrativa>
                
                PROIBIDO gerar notas de bastidores, rascunhos em inglês ('Drafting Narrative', 'Let's') ou checklists ('2nd person? Yes'). Apenas a narrativa final para o jogador!
                """.formatted(rawDraft.length() > 2500 ? rawDraft.substring(0, 2500) : rawDraft);

            Map<String, Object> requestBody = new HashMap<>();
            if (systemInstruction != null && !systemInstruction.isBlank()) {
                requestBody.put("system_instruction", Map.of(
                        "parts", List.of(Map.of("text", systemInstruction))
                ));
            }
            requestBody.put("contents", List.of(Map.of(
                    "role", "user",
                    "parts", List.of(Map.of("text", reformulationPrompt))
            )));

            Map<String, Object> genConfig = new HashMap<>();
            genConfig.put("temperature", 0.7);
            genConfig.put("maxOutputTokens", 65536);
            if (modelToUse.contains("2.5") || modelToUse.contains("2.0")) {
                genConfig.put("thinkingConfig", Map.of("thinkingBudget", 0));
            }
            requestBody.put("generationConfig", genConfig);

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
        } catch (Exception e) {
            log.warn("Falha na chamada de reformulação automática com modelo [{}]: {}", modelToUse, e.getMessage());
        }
        return null;
    }

    /**
     * Valida se uma narrativa extraída é real e legível para o jogador,
     * descartando fallbacks estáticos ou respostas de erro.
     */
    public static boolean isValidPlayerNarrative(String text) {
        if (text == null || text.isBlank()) {
            return false;
        }
        String trimmed = text.trim();
        return !trimmed.startsWith("O Mestre permanece em silêncio")
                && !trimmed.startsWith("O Mestre aguarda sua decisão");
    }
}

