package com.soloforge.common.util;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class JsonExtractorTest {

    @Test
    void shouldExtractJsonObjectSurroundedByMarkdownAndPreamble() {
        String raw = """
                Com certeza! Aqui está o NPC que você pediu:
                ```json
                {
                  "name": "Zemi",
                  "role": "Mestre do Dojo",
                  "description": "Um homem rígido"
                }
                ```
                Espero que ajude na sua crônica!
                """;

        String json = JsonExtractor.extractJsonObject(raw);
        assertNotNull(json);
        assertTrue(json.startsWith("{"));
        assertTrue(json.endsWith("}"));
        assertTrue(json.contains("\"name\": \"Zemi\""));
    }

    @Test
    void shouldExtractJsonArray() {
        String raw = "Aqui estão as sugestões: [{\"id\": 1}, {\"id\": 2}] final das sugestões.";
        String json = JsonExtractor.extractJsonArray(raw);
        assertNotNull(json);
        assertTrue(json.startsWith("["));
        assertTrue(json.endsWith("]"));
    }

    @Test
    void shouldHandleEmptyOrNullGracefully() {
        assertEquals("", JsonExtractor.extractJsonObject(null));
        assertEquals("", JsonExtractor.extractJsonObject("   "));
        assertEquals("", JsonExtractor.extractJsonArray(null));
    }
}
