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

    @Test
    void testZanshinDojoDraftingLeakAndChecklistStripped() {
        String input = """
            Zanshin Dojo, morning training.
            Mestre Zemi (Strict, values purity of body/spirit, dislikes shortcuts).
            Reny bows and whispers a declaration of competence to represent the dojo at the tournament.

                *   Zemi sees Reny as a "rough diamond" but believes severity is the only way to polish him.
                *   Reny is exhausted (lack of sleep from working on the staff).
                *   Zemi's personality: Doesn't smile, few words, believes the body is the only weapon.
                *   Zemi's reaction to Reny's statement: He doesn't want words; he wants results. He likely sees this as "juvenile impulse" or "arrogance," which he intends to crush/shape.

                *   Zemi won't give a warm answer. He will likely challenge Reny's "competence" immediately.
                *   Since Reny is exhausted (though not mechanically "Exhausted" in terms of status, narratively he is), Zemi might notice a slight flaw in his stance or breath.
                *   The scene should transition from dialogue to action (training).

                *   Zemi responds with a cold observation.
                *   He orders a specific, grueling exercise or a sparring match to test this "competence."
                *   Let's go with a "Resistance/Endurance" test first, or a direct sparring match against a larger opponent to highlight Reny's physical struggle vs. his willpower.
                *   *Alternative:* Zemi tests Reny's focus.

                *   Zemi's response: "Competence is not spoken; it is proven in the blood and sweat of the mat."
                *   Action: Zemi orders the students to begin a series of high-intensity strikes (Katas) or a specific endurance test.
                *   *The Twist:* Zemi notices Reny's slight instability (due to the all-nighter).

                *   *Drafting Narrative:*
                    Zemi doesn't move a muscle. His gaze remains heavy, piercing through your facade of confidence. For a long moment, the only sound is the wind whistling through the eaves of the dojo. Then, his voice drops an octave, becoming a low rumble that vibrates in the air.

                    "Palavras são o refúgio dos fracos, Reny. O tatame não ouve promessas; ele sente apenas o peso da verdade."

                    Zemi descruza os braços e faz um gesto seco com a mão, indicando o centro do pátio. "Se você acredita que sua competência é suficiente, prove-a agora. Cento e cinquenta repetições do Kata do Punho Quebrador. Sem pausas. Sem hesitação. Se um único golpe perder a forma ou se seus joelhos vacilarem, você recomeçará do zero."

                    Os outros alunos recuam, sabendo que o Kata do Punho Quebrador é um dos exercícios mais desgastantes do Zanshin Dōjō, exigindo uma estabilidade absoluta e uma força explosiva constante. Para uma criança de 1,40m que passou a noite em claro ajustando engrenagens, cada repetição será uma batalha contra a própria gravidade. O que você faz?

                *   *Ending:* The player must perform the Kata. Since it's an endurance/form test, this is a perfect time for a RES or FOR test.
                *   *Decision:* Let's make it a test of **Resistência (RES)** because he's exhausted and needs to maintain form.

                *   *Tag:* [PEDIR_TESTE: d20 | DT: 14 | Resistência | Executar o Kata do Punho Quebrador até o fim]

                *   2nd person? Yes.
                *   No headers? Yes.
                *   Concise? Yes.
                *   No lists? Yes.
                *   Correct tag? Yes.
            """;

        String result = GeminiService.extractPlayerNarrative(input);

        // Não deve conter notas de bastidores nem preâmbulos em inglês
        assertFalse(result.contains("Zanshin Dojo, morning training"));
        assertFalse(result.contains("rough diamond"));
        assertFalse(result.contains("Zemi's personality"));
        assertFalse(result.contains("The Twist:"));
        assertFalse(result.contains("Drafting Narrative:"));

        // Não deve conter o checklist de validação nem notas de decisão técnica
        assertFalse(result.contains("The player must perform the Kata"));
        assertFalse(result.contains("Let's make it a test"));
        assertFalse(result.contains("2nd person? Yes"));
        assertFalse(result.contains("No headers? Yes"));
        assertFalse(result.contains("Concise? Yes"));
        assertFalse(result.contains("Correct tag? Yes"));

        // Deve conter a narrativa do Mestre e os diálogos
        assertTrue(result.contains("Zemi doesn't move a muscle"));
        assertTrue(result.contains("Palavras são o refúgio dos fracos, Reny."));
        assertTrue(result.contains("Cento e cinquenta repetições do Kata do Punho Quebrador"));
        assertTrue(result.contains("O que você faz?"));

        // Deve preservar a tag mecânica
        assertTrue(result.contains("[PEDIR_TESTE: d20 | DT: 14 | Resistência | Executar o Kata do Punho Quebrador até o fim]"));
    }

    @Test
    void testIsPureThoughtLeakDetectsRealLeak() {
        String leakedText = """
            Zanshin Dojo, morning training.
            Mestre Zemi (Strict, values purity of body/spirit, dislikes shortcuts).
            
            * Zemi sees Reny as a "rough diamond".
            * The player is exhausted.
            * Let's test Resistance or Strength.
            * Decision: Test RES against DT 14.
            * 2nd person? Yes.
            * No headers? Yes.
            * Concise? Yes.
            """;

        assertTrue(GeminiService.isPureThoughtLeak(leakedText), "Deve detectar vazamento de pensamento puro com precisão");
    }

    @Test
    void testIsPureThoughtLeakAvoidsFalsePositiveOnValidNarrative() {
        // Resposta curta e objetiva de combate com tag mecânica - NÃO pode ser descartada
        String validShortCombat = """
            Você avança furtivamente pela escuridão. O silêncio da noite é quebrado pelo estalar de um galho à sua frente.
            
            "Quem está aí?", ecoa uma voz áspera. O que você faz?
            [PEDIR_TESTE: d20 | DT: 13 | Furtividade | Manter-se oculto nas sombras]
            """;

        assertFalse(GeminiService.isPureThoughtLeak(validShortCombat), "Não deve classificar narrativa válida com diálogo e ação como vazamento");
    }

    @Test
    void testIsPureThoughtLeakAvoidsFalsePositiveOnXmlTaggedNarrative() {
        String taggedResponse = """
            <pensamento>
            - O jogador quer correr pelo telhado.
            - DT 12 de Acrobacia.
            </pensamento>
            <narrativa>
            Você salta sobre os telhados úmidos da cidadela enquanto a chuva cai torrencialmente. O que você faz?
            [PEDIR_TESTE: d20 | DT: 12 | Acrobacia | Cruzar os telhados]
            </narrativa>
            """;

        assertFalse(GeminiService.isPureThoughtLeak(taggedResponse), "Respostas com tag <narrativa> válida nunca devem ser consideradas vazamento puro");
    }
}


