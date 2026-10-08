package com.soloforge.common.util;

/**
 * Utilitário para extração resiliente de blocos JSON a partir de saídas de LLMs,
 * ignorando saudações, preâmbulos, blocos markdown (```json ... ```) e comentários.
 */
public final class JsonExtractor {

    private JsonExtractor() {}

    /**
     * Extrai o primeiro objeto JSON ({ ... }) encontrado no texto bruto.
     * Retorna o JSON limpo, ou string vazia se nenhum objeto for encontrado.
     */
    public static String extractJsonObject(String text) {
        if (text == null || text.isBlank()) {
            return "";
        }

        int start = text.indexOf('{');
        int end = text.lastIndexOf('}');

        if (start != -1 && end > start) {
            return text.substring(start, end + 1).trim();
        }

        // Fallback para markdown caso não tenha chaves
        return stripMarkdownFences(text);
    }

    /**
     * Extrai o primeiro array JSON ([ ... ]) encontrado no texto bruto.
     */
    public static String extractJsonArray(String text) {
        if (text == null || text.isBlank()) {
            return "";
        }

        int start = text.indexOf('[');
        int end = text.lastIndexOf(']');

        if (start != -1 && end > start) {
            return text.substring(start, end + 1).trim();
        }

        return stripMarkdownFences(text);
    }

    private static String stripMarkdownFences(String text) {
        String cleaned = text.trim();
        if (cleaned.startsWith("```json")) {
            cleaned = cleaned.substring(7);
        } else if (cleaned.startsWith("```")) {
            cleaned = cleaned.substring(3);
        }
        if (cleaned.endsWith("```")) {
            cleaned = cleaned.substring(0, cleaned.length() - 3);
        }
        return cleaned.trim();
    }
}
