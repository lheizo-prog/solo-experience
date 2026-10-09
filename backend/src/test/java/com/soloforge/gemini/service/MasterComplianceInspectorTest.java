package com.soloforge.gemini.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class MasterComplianceInspectorTest {

    private MasterComplianceInspector inspector;

    @BeforeEach
    void setUp() {
        inspector = new MasterComplianceInspector();
    }

    @Test
    @DisplayName("Deve acusar MISSING_DAMAGE_ROLL quando jogador acerta ataque e Mestre não pede dano")
    void shouldDetectMissingDamageRollOnSuccessfulAttack() {
        List<Map<String, String>> history = List.of(
                Map.of("role", "PLAYER", "text", "🎲 [TESTE OFICIAL: Ataque com Espada]: O jogador rolou 1d20 [ 16 ] + 2 (Bônus de Ataque com Espada) = Total 18 vs DT 13 (SUCESSO) para \"Atingir o goblin\".")
        );

        String masterResponse = """
                <narrativa>
                Sua lâmina perfura o peito do goblin com violência. Ele cai morto instantaneamente no chão da caverna.
                O que você faz?
                </narrativa>
                """;

        MasterComplianceInspector.ComplianceResult result = inspector.inspect(masterResponse, history);

        assertFalse(result.isCompliant(), "Deveria reprovar por ausência de rolagem de dano");
        assertTrue(result.getViolations().stream()
                .anyMatch(v -> v.getType() == MasterComplianceInspector.ViolationType.MISSING_DAMAGE_ROLL));
        assertTrue(result.buildRemediationPrompt(masterResponse).contains("rolagem de dano obrigatória"));
    }

    @Test
    @DisplayName("Deve aprovar quando jogador acerta ataque e Mestre emite tag de rolagem de dano")
    void shouldApproveWhenDamageTagIsPresentAfterAttack() {
        List<Map<String, String>> history = List.of(
                Map.of("role", "PLAYER", "text", "🎲 [TESTE OFICIAL: Ataque com Espada]: O jogador rolou 1d20 [ 16 ] + 2 = Total 18 vs DT 13 (SUCESSO) para \"Atingir o goblin\".")
        );

        String masterResponse = """
                <narrativa>
                Você encontra uma brecha na guarda do goblin e avança sua espada em direção ao torso dele!
                
                [PEDIR_TESTE: 1d8 | DT: 0 | Dano (Espada) | Rolar dano do golpe contra o Goblin]
                </narrativa>
                """;

        MasterComplianceInspector.ComplianceResult result = inspector.inspect(masterResponse, history);

        assertTrue(result.isCompliant(), "Deveria aprovar pois a tag de dano foi incluída");
        assertTrue(result.getViolations().isEmpty());
    }

    @Test
    @DisplayName("Não deve exigir dano quando o teste do jogador não for ataque (ex: atletismo/escalar)")
    void shouldNotRequireDamageWhenRollIsNotCombatAttack() {
        List<Map<String, String>> history = List.of(
                Map.of("role", "PLAYER", "text", "🎲 [TESTE OFICIAL: Atletismo]: O jogador rolou 1d20 [ 15 ] = Total 17 vs DT 14 (SUCESSO) para \"Escalar a encosta\".")
        );

        String masterResponse = """
                <narrativa>
                Você crava as botas nas fendas de pedra e alcança o topo do penhasco sem dificuldades. A brisa da montanha sopra fria contra seu rosto.
                
                O que você faz?
                </narrativa>
                """;

        MasterComplianceInspector.ComplianceResult result = inspector.inspect(masterResponse, history);

        assertTrue(result.isCompliant());
    }

    @Test
    @DisplayName("Deve acusar PURE_THOUGHT_LEAK quando a resposta é puramente notas e checklists de bastidores")
    void shouldDetectPureThoughtLeak() {
        List<Map<String, String>> history = List.of(
                Map.of("role", "PLAYER", "text", "Investigo a porta antiga.")
        );

        String thoughtLeak = """
                * Let's analyze the scene.
                * The player wants to inspect the door.
                * System: DC 15 Perception.
                * 2nd person? Yes.
                * Final check: Ready.
                """;

        MasterComplianceInspector.ComplianceResult result = inspector.inspect(thoughtLeak, history);

        assertFalse(result.isCompliant());
        assertTrue(result.getViolations().stream()
                .anyMatch(v -> v.getType() == MasterComplianceInspector.ViolationType.PURE_THOUGHT_LEAK));
    }

    @Test
    @DisplayName("Deve acusar PUPPETEERING_DETECTED quando o Mestre toma controle da escolha moral/mental do jogador")
    void shouldDetectPuppeteeringWhenMasterForcesPlayerChoice() {
        List<Map<String, String>> history = List.of(
                Map.of("role", "PLAYER", "text", "Olho para o bandido ferido no chão.")
        );

        String puppeteering = """
                <narrativa>
                O bandido implora por misericórdia com lágrimas nos olhos.
                Você decide perdoar o homem e resolve largar suas armas para ajudá-lo a se levantar.
                O que você faz?
                </narrativa>
                """;

        MasterComplianceInspector.ComplianceResult result = inspector.inspect(puppeteering, history);

        assertFalse(result.isCompliant());
        assertTrue(result.getViolations().stream()
                .anyMatch(v -> v.getType() == MasterComplianceInspector.ViolationType.PUPPETEERING_DETECTED));
    }

    @Test
    @DisplayName("Deve aprovar prosa rica com encerramento de agência e sem violações")
    void shouldApproveFlawlessNarrative() {
        List<Map<String, String>> history = List.of(
                Map.of("role", "PLAYER", "text", "Tento decifrar os hieróglifos na tumba.")
        );

        String perfectNarrative = """
                <narrativa>
                A luz da sua tocha tremula contra a pedra milenar. Os símbolos esculpidos no arco contam a lenda dos Reis das Cinzas, alertando sobre um guardião que repousa nas profundezas.
                
                Um clique sutil ecoa sob a laje à sua frente.
                
                O que você faz?
                </narrativa>
                """;

        MasterComplianceInspector.ComplianceResult result = inspector.inspect(perfectNarrative, history);

        assertTrue(result.isCompliant());
        assertTrue(result.getViolations().isEmpty());
    }
}
