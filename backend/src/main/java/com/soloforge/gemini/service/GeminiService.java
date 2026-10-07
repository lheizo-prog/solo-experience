package com.soloforge.gemini.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
public class GeminiService {

    @Value("${gemini.api.key:}")
    private String apiKey;

    @Value("${gemini.api.model:gemini-1.5-flash}")
    private String model;

    @Value("${gemini.api.url:https://generativelanguage.googleapis.com/v1beta/models}")
    private String baseUrl;

    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    public GeminiService() {
        this.restClient = RestClient.builder().build();
        this.objectMapper = new ObjectMapper();
    }

    /**
     * Gera resposta com base no system instruction (Bíblia + Regras + Contexto) e nas mensagens de chat
     */
    public String generateStoryResponse(String systemInstruction, List<Map<String, String>> chatHistory) {
        if (apiKey == null || apiKey.isBlank()) {
            return "[Modo Offline/Sem Chave de API]: O Mestre observa a taverna silenciosa. (Configure sua GEMINI_API_KEY no backend para ativar as narrações mágicas da IA!)";
        }

        try {
            String endpoint = String.format("%s/%s:generateContent?key=%s", baseUrl, model, apiKey);

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
            return "O Mestre permanece em silêncio contemplating o destino...";
        } catch (Exception e) {
            log.error("Erro ao chamar API do Gemini", e);
            return "Erro ao contatar o oráculo do Gemini: " + e.getMessage();
        }
    }

    /**
     * Chamada direta para geração de texto/JSON sem histórico
     */
    public String generateContent(String systemInstruction, String userPrompt) {
        if (apiKey == null || apiKey.isBlank()) {
            return "";
        }

        try {
            String endpoint = String.format("%s/%s:generateContent?key=%s", baseUrl, model, apiKey);

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
            log.error("Erro ao gerar conteúdo direto via Gemini", e);
            return "";
        }
    }
}

