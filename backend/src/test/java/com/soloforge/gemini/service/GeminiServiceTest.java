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

    @Test
    void testFallbackWhenNarrativeBecomesEmpty() {
        // Cenário onde o modelo gastou tokens em pensamento e a narrativa ficou vazia
        String input = """
            <pensamento>
            Raciocínio longo de 1000 tokens sobre o ambiente e regras...
            </pensamento>
            <narrativa>
            </narrativa>
            """;

        String result = GeminiService.extractPlayerNarrative(input);
        assertNotNull(result);
        assertFalse(result.isBlank());
        assertTrue(result.contains("O Mestre aguarda sua decisão") || result.contains("Raciocínio longo"));
    }

    @Test
    void testRealWorldLeakWithCharacterSheetAndD100MultipleDrafts() {
        // Caso real enviado pelo usuário: vazamento de ficha, análise d100, múltiplos rascunhos e auto-correções em inglês
        String input = """
            Reny (Humano, 7 anos, 1,40m).
            FOR 6, KI 2, VEL 6, RES 4, ESP 5.
            Testar a absorção de impacto do bastão extensível golpeando uma árvore perto de casa.
            O jogador usou um `[ROLAGEM LIVRE]` de `d100` e obteve `43`.

                *   O sistema padrão usa `d20 + Atributo` contra uma `DT` (Dificuldade).
                *   O jogador usou uma escala de `d100` (provavelmente uma mecânica de "sucesso percentual" ou apenas uma escolha de estilo de jogo).
                *   Em sistemas de d100, geralmente 43 é um resultado mediano/médio-baixo (quase metade do caminho).
                *   *Interpretação Narrativa:* O teste é de impacto/absorção. O bastão é uma invenção.
                *   *Sucesso:* O bastão não quebra. A energia é dissipada.
                *   *Drafting Narrativa:*
                    Você caminha silenciosamente pela escuridão...
                *   *Resultado Final:*
                    Você caminha sob o manto de escuridão...
                    O que você faz?

                *Wait, the player used d100. I should probably acknowledge the result implicitly.*
                *Final check on instructions:*
                - 2nd person? Yes.
                - No headers in narrative? Yes.
                - Ends with "O que você faz?"? Yes.

                *Narrativa:*
                Você caminha sob o manto de escuridão, o bastão compactado em sua mão como um segredo guardado. A árvore escolhida é de tronco largo e casca áspera, oferecendo a resistência necessária para o teste. Você se posiciona, estabiliza o peso do seu corpo e aciona o mecanismo de liberação contra a madeira.

                *THUD!*

                A expansão é súbita e poderosa. O bastão atinge o tronco com um impacto seco que parece ecoar por toda a floresta próxima. O mecanismo de absorção de impacto cumpre sua função, mas o resultado é apenas parcial.

                O cansaço começa a pesar em seus ombros, lembrando que o dia de amanhã será longo.

                O que você faz?

                *Self-Correction:* The user used a "Rolagem Livre". I should treat it as a success of sorts. 43/100 is a "passable" result.

                *Ready.*
            """;

        String result = GeminiService.extractPlayerNarrative(input);

        // Não deve conter a ficha nem a análise mecânica do d100
        assertFalse(result.contains("FOR 6, KI 2"));
        assertFalse(result.contains("ROLAGEM LIVRE"));
        assertFalse(result.contains("Interpretação Narrativa"));
        assertFalse(result.contains("O sistema padrão usa"));

        // Não deve conter as reflexões em inglês
        assertFalse(result.contains("Wait, the player"));
        assertFalse(result.contains("Final check"));
        assertFalse(result.contains("Self-Correction"));
        assertFalse(result.contains("Ready."));

        // Deve conter estritamente a narrativa final
        assertTrue(result.startsWith("Você caminha sob o manto de escuridão"));
        assertTrue(result.contains("*THUD!*"));
        assertTrue(result.contains("O que você faz?"));
    }

    @Test
    void testMarkdownCodeBlockWrappedResponse() {
        String input = """
            ```xml
            <pensamento>
            Avaliando DT 12 para acrobacia.
            </pensamento>
            <narrativa>
            Você salta sobre o muro com agilidade felina. O que você faz?
            </narrativa>
            ```
            """;

        String result = GeminiService.extractPlayerNarrative(input);
        assertFalse(result.contains("```"));
        assertFalse(result.contains("<pensamento>"));
        assertFalse(result.contains("Avaliando DT"));
        assertEquals("Você salta sobre o muro com agilidade felina. O que você faz?", result);
    }

    @Test
    void testUnclosedThoughtTagFollowedByNarrative() {
        String input = """
            <pensamento>
            O jogador tenta algo difícil. O mestre decide pela DT 16...
            <narrativa>
            As sombras se agitam na viela escura à sua frente. O que você faz?
            </narrativa>
            """;

        String result = GeminiService.extractPlayerNarrative(input);
        assertFalse(result.contains("DT 16"));
        assertEquals("As sombras se agitam na viela escura à sua frente. O que você faz?", result);
    }

    @Test
    void testEnglishThoughtAndReasoningTags() {
        String input = """
            <thought>
            Evaluating player action and difficulty...
            </thought>
            <story>
            A porta range ao se abrir, revelando um salão coberto de poeira e teias de aranha. O que você faz?
            </story>
            """;

        String result = GeminiService.extractPlayerNarrative(input);
        assertFalse(result.contains("Evaluating player"));
        assertEquals("A porta range ao se abrir, revelando um salão coberto de poeira e teias de aranha. O que você faz?", result);
    }
}
