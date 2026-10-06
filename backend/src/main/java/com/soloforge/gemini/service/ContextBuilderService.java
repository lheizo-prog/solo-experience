package com.soloforge.gemini.service;

import com.soloforge.campaign.entity.Campaign;
import com.soloforge.campaign.entity.CampaignBible;
import com.soloforge.campaign.entity.CampaignSystem;
import com.soloforge.campaign.entity.StoryArc;
import com.soloforge.campaign.repository.StoryArcRepository;
import com.soloforge.npc.entity.Npc;
import com.soloforge.npc.repository.NpcRepository;
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

        sb.append("=== DIRETRIZES DO MESTRE ===\n");
        sb.append("1. Responda em português brasileiro com tom literário imersivo.\n");
        sb.append("2. Descreva os arredores, as reações dos NPCs e as consequências das ações do jogador com base no sistema de regras.\n");
        sb.append("3. Quando apropriado, solicite testes de dados ao jogador de acordo com a mecânica definida.\n");
        sb.append("4. Ao final de cada intervenção do mestre, dê gancho e passe a bola para o jogador com 'O que você faz?'.\n");

        return sb.toString();
    }
}
