package com.soloforge.gemini.service;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class GeminiServiceTest {

    @Test
    void testCleanXmlNarrativeExtraction() {
        String input = """
            <pensamento>
            - O jogador quer saltar o abismo.
            - DT 15 Atletismo.
            </pensamento>
            <narrativa>
            Você observa a fenda profunda diante de seus pés. O vento sopra gélido. O que você faz?
            [PEDIR_TESTE: d20 | DT: 15 | Atletismo | Saltar o abismo]
            </narrativa>
            """;

        String result = GeminiService.extractPlayerNarrative(input);
        assertFalse(result.contains("<pensamento>"));
        assertFalse(result.contains("O jogador quer saltar"));
        assertTrue(result.startsWith("Você observa a fenda profunda"));
        assertTrue(result.contains("[PEDIR_TESTE: d20 | DT: 15 | Atletismo | Saltar o abismo]"));
    }

    @Test
    void testLeakedThoughtInsideNarrativaTag() {
        String input = """
            <narrativa>
            * O objeto agora é uma ferramenta confiável.
            * *Sem notas de bastidores.*
            * *Sem metalinguagem.*
            * *Foco na imersão.*
            * *Ajuste de tom:* "O clique seco ecoa..."
            *(Decisão do Mestre)*: Vou permitir que ele sinta o triunfo.

            *Drafting response:*
            O som é quase imperceptível, mas para seus ouvidos treinados, é a música mais doce do mundo: um click metálico.
            Você segura o bastão com firmeza. O que você faz?
            </narrativa>
            """;

        String result = GeminiService.extractPlayerNarrative(input);
        assertFalse(result.contains("Sem notas de bastidores"));
        assertFalse(result.contains("Decisão do Mestre"));
        assertFalse(result.contains("Drafting response"));
        assertTrue(result.startsWith("O som é quase imperceptível"));
        assertTrue(result.contains("O que você faz?"));
    }

    @Test
    void testRawDraftingWithoutXmlTags() {
        String input = """
            * O ambiente deve ser claustrofóbico.
            * Shonen/Seinen.
            * *Ajuste de tom:*
            *(Decisão do Mestre)*: Permitir o teste.

            *Drafting response:*
            As chamas da forja crepitam em faíscas alaranjadas contra o chão de terra batida.
            Você respira fundo limpando a fuligem da testa. O que você faz?
            """;

        String result = GeminiService.extractPlayerNarrative(input);
        assertFalse(result.contains("Shonen/Seinen"));
        assertFalse(result.contains("Drafting response"));
        assertTrue(result.startsWith("As chamas da forja"));
    }

    @Test
    void testPreserveDiceTagAndStripTrailingChecklist() {
        String input = """
            <narrativa>
            Você apoia o peso do corpo sobre o joelho direito e aguarda o momento ideal. O que você faz?
            [PEDIR_TESTE: d20 | DT: 14 | Furtividade | Passar despercebido pelos guardas]
            *Check against rules*
            - DT compatível com a iluminação do local.
            </narrativa>
            """;

        String result = GeminiService.extractPlayerNarrative(input);
        assertTrue(result.contains("[PEDIR_TESTE: d20 | DT: 14 | Furtividade | Passar despercebido pelos guardas]"));
        assertFalse(result.contains("Check against rules"));
        assertFalse(result.contains("DT compatível"));
    }
}
