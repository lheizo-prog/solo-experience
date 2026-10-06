package com.soloforge.gemini.service;

import com.soloforge.campaign.entity.Campaign;
import com.soloforge.campaign.entity.CampaignBible;
import com.soloforge.campaign.entity.CampaignSystem;
import com.soloforge.campaign.entity.StoryArc;
import com.soloforge.campaign.repository.StoryArcRepository;
import com.soloforge.npc.entity.Npc;
import com.soloforge.npc.repository.NpcRepository;
import com.soloforge.session.entity.Session;
import com.soloforge.session.repository.SessionRepository;
import com.soloforge.world.entity.WorldDecision;
import com.soloforge.world.repository.WorldDecisionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;


import java.util.List;

@Service
@RequiredArgsConstructor
public class ContextBuilderService {

    private final StoryArcRepository storyArcRepository;
    private final NpcRepository npcRepository;
    private final WorldDecisionRepository worldDecisionRepository;
    private final SessionRepository sessionRepository;


    public String buildMasterPrompt(Campaign campaign) {
        StringBuilder sb = new StringBuilder();

        sb.append("Você é o Mestre Supremo de RPG de Mesa (Game Master) na plataforma SoloForge.\n");
        sb.append("Seu papel é conduzir uma narrativa rica, envolvente, reativa e desafiadora para um jogador solo.\n\n");

        sb.append("=== INFORMAÇÕES DA CAMPANHA ===\n");
        sb.append("Título: ").append(campaign.getTitle()).append("\n");
        if (campaign.getGenre() != null) {
            sb.append("Gênero: ").append(campaign.getGenre()).append("\n");
        }
        if (campaign.getSynopsis() != null) {
            sb.append("Sinopse: ").append(campaign.getSynopsis()).append("\n");
        }
        sb.append("\n");

        // Bíblia
        CampaignBible bible = campaign.getBible();
        if (bible != null) {
            sb.append("=== BÍBLIA DA CAMPANHA ===\n");
            if (bible.getWorldLore() != null) sb.append("Lore do Mundo:\n").append(bible.getWorldLore()).append("\n");
            if (bible.getToneAndStyle() != null) sb.append("Tom e Estilo Narrativo:\n").append(bible.getToneAndStyle()).append("\n");
            if (bible.getPlayerCharacter() != null) sb.append("Personagem do Jogador (PJ):\n").append(bible.getPlayerCharacter()).append("\n");
            if (bible.getKeyThemes() != null) sb.append("Temas Principais:\n").append(bible.getKeyThemes()).append("\n");
            sb.append("\n");
        }

        // Sistema de regras
        CampaignSystem system = campaign.getSystem();
        if (system != null) {
            sb.append("=== SISTEMA DE REGRAS E MECÂNICAS ===\n");
            sb.append("Nome do Sistema: ").append(system.getName()).append("\n");
            if (system.getCoreMechanics() != null) sb.append("Mecânicas Centrais:\n").append(system.getCoreMechanics()).append("\n");
            if (system.getStatsAndAttributes() != null) sb.append("Atributos & Estatísticas:\n").append(system.getStatsAndAttributes()).append("\n");
            if (system.getRollInstructions() != null) sb.append("Instruções de Rolagem/Desafio:\n").append(system.getRollInstructions()).append("\n");
            sb.append("\n");
        }

        // Arcos narrativos ativos
        List<StoryArc> activeArcs = storyArcRepository.findByCampaignIdAndStatus(campaign.getId(), "ACTIVE");
        if (!activeArcs.isEmpty()) {
            sb.append("=== ARCOS NARRATIVOS ATIVOS ===\n");
            for (StoryArc arc : activeArcs) {
                sb.append("- [").append(arc.getTitle()).append("]: ").append(arc.getGoal());
                if (arc.getCurrentProgress() != null) sb.append(" (Progresso: ").append(arc.getCurrentProgress()).append(")");
                sb.append("\n");
            }
            sb.append("\n");
        }

        // NPCs Cristalizados
        List<Npc> crystallizedNpcs = npcRepository.findByCampaignIdAndIsCrystallizedTrue(campaign.getId());
        if (!crystallizedNpcs.isEmpty()) {
            sb.append("=== NPCS CONHECIDOS & CRISTALIZADOS ===\n");
            for (Npc npc : crystallizedNpcs) {
                sb.append("- ").append(npc.getName()).append(" (").append(npc.getRole() != null ? npc.getRole() : "Personagem").append("): ");
                if (npc.getPersonality() != null) sb.append("Personalidade: ").append(npc.getPersonality()).append(". ");
                if (npc.getMemory() != null) sb.append("Memória com o jogador: ").append(npc.getMemory());
                sb.append("\n");
            }
            sb.append("\n");
        }

        // Decisões cruciais do mundo
        List<WorldDecision> decisions = worldDecisionRepository.findByCampaignIdOrderByCreatedAtDesc(campaign.getId());
        if (!decisions.isEmpty()) {
            sb.append("=== MARCAS E DECISÕES NO MUNDO ===\n");
            for (WorldDecision d : decisions) {
                sb.append("- Decisão: ").append(d.getDecision()).append(" -> Consequência: ").append(d.getConsequence()).append("\n");
            }
            sb.append("\n");
        }

        // Resumos dos Atos Anteriores (Memória Episódica)
        List<Session> pastSessions = sessionRepository.findByCampaignIdOrderBySessionNumberAsc(campaign.getId());
        boolean hasPastSummaries = pastSessions.stream().anyMatch(s -> s.getSummary() != null && !s.getSummary().isBlank());
        if (hasPastSummaries) {
            sb.append("=== RESUMO DOS ATOS / SESSÕES ANTERIORES ===\n");
            for (Session s : pastSessions) {
                if (s.getSummary() != null && !s.getSummary().isBlank()) {
                    sb.append("Ato ").append(s.getSessionNumber()).append(" (").append(s.getTitle() != null ? s.getTitle() : "Capítulo").append("):\n");
                    sb.append(s.getSummary()).append("\n\n");
                }
            }
        }


        sb.append("=== DIRETRIZES ESTATUTÁRIAS DO MESTRE (ÁRBITRO DE REGRAS) ===\n");
        sb.append("1. **ÁRBITRO IMPARCIAL DAS REGRAS**: Você DEVE verificar e seguir estritamente o SISTEMA DE REGRAS definido acima. NUNCA ignore as mecânicas, limitações de atributos ou magias.\n");
        sb.append("2. **CORREÇÃO E ALERTA DE INFRAÇÕES**: Se o jogador tentar realizar uma ação impossível, que viole suas características, atributos, inventário ou as regras do sistema, você DEVE alertá-lo narrativamente ou intervir explicando a impossibilidade dentro do mundo e convidá-lo a tentar outra abordagem.\n");
        sb.append("3. **SOLICITAÇÃO FORMAL DE ROLAGEM COM DT (Dificuldade)**:\n");
        sb.append("   - NUNCA decida o desfecho de uma ação arriscada ou incerta antes do jogador rolar os dados.\n");
        sb.append("   - Quando a ação exigir um teste de acordo com as regras, declare expressamente a dificuldade (DT) e o motivo narrativo, e inclua no final da sua fala uma tag de sistema exatamente no formato:\n");
        sb.append("     `[PEDIR_TESTE: {tipo_de_dado} | DT: {numero} | {atributo_ou_pericia} | {descricao_curta}]`\n");
        sb.append("     Exemplo: `[PEDIR_TESTE: d20 | DT: 14 | Atletismo | Escalar a muralha escorregadia]`\n");
        sb.append("   - O sistema do SoloForge irá gerar automaticamente um botão interativo para o jogador clicar e rolar o dado.\n");
        sb.append("4. **REAÇÃO AO RESULTADO DO DADO**:\n");
        sb.append("   - Quando você receber uma mensagem de rolagem de dados (ex: '[ROLAGEM DE DADOS: d20 resultou em 16 (DT: 14)]'), compare IMEDIATAMENTE com a DT previamente estipulada e narre com precisão o Sucesso, Sucesso Crítico, Falha ou Falha Crítica com base nas regras.\n");
        sb.append("5. **TOM NARRATIVO & PASSAGEM DE TURNO**:\n");
        sb.append("   - Narre em português com riqueza literária, suspense e vivacidade sensorial.\n");
        sb.append("   - Conclua sempre instigando o jogador: 'O que você faz?'.\n");

        return sb.toString();
    }
}
