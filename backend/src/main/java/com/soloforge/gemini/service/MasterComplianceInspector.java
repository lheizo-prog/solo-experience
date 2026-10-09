package com.soloforge.gemini.service;

import lombok.Builder;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * Inspetor determinístico de regras do Mestre (Fast-Gate).
 * Audita respostas em 0ms no backend contra violações de mecânicas de combate,
 * integridade narrativa, vazamento de rascunhos técnicos e preservação de agência do jogador.
 */
@Slf4j
@Component
public class MasterComplianceInspector {

    public enum ViolationType {
        MISSING_DAMAGE_ROLL,
        PURE_THOUGHT_LEAK,
        PUPPETEERING_DETECTED,
        MISSING_AGENCY_PROMPT
    }

    @Getter
    @Builder
    public static class ComplianceViolation {
        private final ViolationType type;
        private final String message;
        private final String specificInstruction;
    }

    @Getter
    @Builder
    public static class ComplianceResult {
        private final boolean compliant;
        private final List<ComplianceViolation> violations;

        public static ComplianceResult success() {
            return ComplianceResult.builder()
                    .compliant(true)
                    .violations(Collections.emptyList())
                    .build();
        }

        public static ComplianceResult failure(List<ComplianceViolation> violations) {
            return ComplianceResult.builder()
                    .compliant(false)
                    .violations(violations)
                    .build();
        }

        public String buildRemediationPrompt(String rawDraft) {
            StringBuilder sb = new StringBuilder();
            sb.append("[ALERTA DE SISTEMA - AUTO-CORREÇÃO DE PROTOCOLO DO MESTRE]:\n");
            sb.append("A sua resposta anterior violou regras críticas do protocolo do SoloForge:\n\n");

            for (ComplianceViolation v : violations) {
                sb.append("• ").append(v.getMessage()).append("\n");
                sb.append("  INSTRUÇÃO OBRIGATÓRIA: ").append(v.getSpecificInstruction()).append("\n\n");
            }

            sb.append("Rascunho de raciocínio prévio:\n\"\"\"\n");
            sb.append(rawDraft.length() > 2500 ? rawDraft.substring(0, 2500) : rawDraft);
            sb.append("\n\"\"\"\n\n");
            sb.append("Reescreva a cena oficial corrigindo os pontos acima, em português, dentro de:\n");
            sb.append("<narrativa>\n(Sua prosa viva, imersiva, diálogos e fechando com o gancho/tag exigidos)\n</narrativa>\n");
            sb.append("PROIBIDO rascunhos em inglês ou checklists. Apenas a narrativa final corrigida!");

            return sb.toString();
        }
    }

    private static final Pattern ATTACK_KEYWORD_PATTERN = Pattern.compile(
            "(?i)\\b(?:ataque|atacar|golpe|golpear|espada|arco|machado|combate|lança|adaga|disparo|tiro|lâmina|flecha|contra-ataque|martelo|flechada|estocada)\\b"
    );

    private static final Pattern SUCCESS_ROLL_PATTERN = Pattern.compile(
            "(?i)\\[TESTE\\s+(?:OFICIAL|COM\\s+VANTAGEM|COM\\s+DESVANTAGEM):[^\\]]+\\].*?=\\s*Total\\s+\\d+\\s+vs\\s+DT\\s+\\d+\\s*\\((?:SUCESSO|SUCESSO\\s+CRÍTICO[^)]*)\\)"
    );

    private static final Pattern DAMAGE_TAG_PATTERN = Pattern.compile(
            "(?i)\\[PEDIR_TESTE:\\s*\\d*[dD]\\d+\\s*\\|\\s*DT:\\s*(?:0|-|N\\/?A)\\s*\\|[^|]*dano[^|]*\\|[^]]+\\]"
    );

    private static final Pattern GENERAL_DAMAGE_PATTERN = Pattern.compile(
            "(?i)\\[PEDIR_TESTE:[^\\]]*dano[^\\]]*\\]"
    );

    private static final Pattern PUPPETEERING_PATTERN = Pattern.compile(
            "(?i)\\b(?:você decide\\s+[a-zà-ú]+|você resolve\\s+[a-zà-ú]+|você escolhe\\s+[a-zà-ú]+|você opta por\\b|você sente que deve\\b|você não tem escolha senão\\b)"
    );

    private static final Pattern AGENCY_CLOSING_PATTERN = Pattern.compile(
            "(?i)(?:O que você faz\\?|Como você reage\\?|Qual é a sua ação\\?|O que você decide fazer\\?|\\[PEDIR_TESTE:|\\[DICAS_DE_ACAO:)"
    );

    /**
     * Inspeciona a resposta do Mestre considerando o histórico do chat recente.
     */
    public ComplianceResult inspect(String rawResponse, List<Map<String, String>> chatHistory) {
        if (rawResponse == null || rawResponse.isBlank()) {
            return ComplianceResult.failure(List.of(
                    ComplianceViolation.builder()
                            .type(ViolationType.PURE_THOUGHT_LEAK)
                            .message("Resposta vazia ou inexistente da IA.")
                            .specificInstruction("Entregue uma narrativa viva e detalhada para o jogador.")
                            .build()
            ));
        }

        List<ComplianceViolation> violations = new ArrayList<>();

        // 1. Verificação de Vazamento de Rascunho Puro
        if (GeminiService.isPureThoughtLeak(rawResponse)) {
            violations.add(ComplianceViolation.builder()
                    .type(ViolationType.PURE_THOUGHT_LEAK)
                    .message("A resposta conteve apenas notas técnicas de bastidores sem prosa narrativa efetiva.")
                    .specificInstruction("Entregue a narrativa viva para o jogador dentro de <narrativa> sem checklists técnicos ou rascunhos em inglês.")
                    .build());
        }

        // 2. Verificação de Ciclo de Combate em Dois Estágios (Rolagem Obrigatória de Dano)
        if (isLastTurnSuccessfulAttack(chatHistory)) {
            boolean hasDamageTag = DAMAGE_TAG_PATTERN.matcher(rawResponse).find()
                    || GENERAL_DAMAGE_PATTERN.matcher(rawResponse).find();

            if (!hasDamageTag) {
                violations.add(ComplianceViolation.builder()
                        .type(ViolationType.MISSING_DAMAGE_ROLL)
                        .message("O jogador acertou o ataque no turno anterior, mas você não solicitou a rolagem de dano obrigatória antes do desfecho.")
                        .specificInstruction("Insira a tag de dano obrigatória: [PEDIR_TESTE: {dado_da_arma} | DT: 0 | Dano ({arma}) | Rolar dano do golpe contra {alvo}]. Narre apenas o início do golpe/impacto, sem matar ou finalizar o oponente antes de saber os pontos de dano.")
                        .build());
            }
        }

        // 3. Verificação de Invasão de Agência (Puppeteering)
        String playerNarrative = GeminiService.extractPlayerNarrative(rawResponse);
        if (PUPPETEERING_PATTERN.matcher(playerNarrative).find()) {
            violations.add(ComplianceViolation.builder()
                    .type(ViolationType.PUPPETEERING_DETECTED)
                    .message("Você controlou as decisões internas ou morais do protagonista do jogador.")
                    .specificInstruction("Descreva apenas as reações do mundo e dos NPCs. Jamais narre o que o jogador 'decide' ou 'escolhe'. Devolva a agência ao jogador.")
                    .build());
        }

        // 4. Verificação de Fechamento de Agência
        boolean hasPureThoughtViolation = violations.stream()
                .anyMatch(v -> v.getType() == ViolationType.PURE_THOUGHT_LEAK);

        if (!hasPureThoughtViolation && !AGENCY_CLOSING_PATTERN.matcher(playerNarrative).find()) {
            violations.add(ComplianceViolation.builder()
                    .type(ViolationType.MISSING_AGENCY_PROMPT)
                    .message("A narrativa terminou abruptamente sem devolver a agência ao jogador.")
                    .specificInstruction("Finalize a cena com uma pergunta de agência ('O que você faz?' ou 'Como você reage?') e as opções cabíveis.")
                    .build());
        }

        if (violations.isEmpty()) {
            return ComplianceResult.success();
        }

        return ComplianceResult.failure(violations);
    }

    /**
     * Avalia se a última mensagem do jogador foi um teste de ataque bem-sucedido.
     */
    public boolean isLastTurnSuccessfulAttack(List<Map<String, String>> chatHistory) {
        if (chatHistory == null || chatHistory.isEmpty()) {
            return false;
        }

        // Procura a última mensagem enviada pelo jogador
        for (int i = chatHistory.size() - 1; i >= 0; i--) {
            Map<String, String> msg = chatHistory.get(i);
            String role = msg.get("role");
            if ("PLAYER".equalsIgnoreCase(role) || "user".equalsIgnoreCase(role)) {
                String text = msg.get("text");
                if (text == null) return false;

                // Não é teste de acerto se for a própria rolagem de dano
                if (text.contains("ROLAGEM DE DANO") || text.contains("Total de Dano")) {
                    return false;
                }

                boolean isSuccessRoll = SUCCESS_ROLL_PATTERN.matcher(text).find();
                boolean isAttackContext = ATTACK_KEYWORD_PATTERN.matcher(text).find();

                return isSuccessRoll && isAttackContext;
            }
        }

        return false;
    }
}
