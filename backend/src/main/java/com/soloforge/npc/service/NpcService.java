package com.soloforge.npc.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.soloforge.campaign.entity.Campaign;
import com.soloforge.campaign.entity.CampaignSystem;
import com.soloforge.campaign.repository.CampaignRepository;
import com.soloforge.gemini.service.GeminiService;
import com.soloforge.npc.dto.NpcDto;
import com.soloforge.npc.entity.Npc;
import com.soloforge.npc.repository.NpcRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class NpcService {

    private final NpcRepository npcRepository;
    private final CampaignRepository campaignRepository;
    private final GeminiService geminiService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Transactional(readOnly = true)
    public List<NpcDto.Response> getNpcsByCampaign(UUID campaignId) {
        return npcRepository.findByCampaignId(campaignId).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public NpcDto.Response createNpc(UUID campaignId, NpcDto.CreateRequest request) {
        Campaign campaign = campaignRepository.findById(campaignId)
                .orElseThrow(() -> new IllegalArgumentException("Campanha não encontrada: " + campaignId));

        Npc npc = Npc.builder()
                .campaign(campaign)
                .name(request.getName())
                .role(request.getRole() != null ? request.getRole() : "Habitante")
                .description(request.getDescription())
                .personality(request.getPersonality())
                .memory(request.getMemory())
                .isCrystallized(request.getIsCrystallized() != null ? request.getIsCrystallized() : true)
                .build();

        return toDto(npcRepository.save(npc));
    }

    /**
     * Forja um NPC ou Boss sob medida com base nas regras e mecânicas da campanha
     */
    @Transactional
    public NpcDto.Response generateNpcWithAi(UUID campaignId, NpcDto.GenerateAiRequest req) {
        Campaign campaign = campaignRepository.findById(campaignId)
                .orElseThrow(() -> new IllegalArgumentException("Campanha não encontrada: " + campaignId));

        CampaignSystem system = campaign.getSystem();
        String systemName = system != null ? system.getName() : "Sistema Genérico";
        String coreMechanics = system != null && system.getCoreMechanics() != null ? system.getCoreMechanics() : "D20 padrão";
        String statsRules = system != null && system.getStatsAndAttributes() != null ? system.getStatsAndAttributes() : "Atributos D20";

        String targetType = req.getType() != null && !req.getType().isBlank() ? req.getType().toUpperCase() : "NPC";
        String challenge = req.getChallengeLevel() != null && !req.getChallengeLevel().isBlank() ? req.getChallengeLevel().toUpperCase() : "MÉDIO";
        String concept = req.getConcept() != null && !req.getConcept().isBlank() ? req.getConcept() : "Um encontro memorável e desafiador para o jogador";

        String prompt = String.format("""
            Você é um Game Master e Designer de Monstros/NPCs para RPGs de Mesa.
            Crie um personagem (%s - Desafio: %s) totalmente coerente com as regras e atributos do sistema abaixo.

            === SISTEMA DE REGRAS DA CAMPANHA ===
            Nome: %s
            Mecânicas Centrais: %s
            Regras de Atributos/Estatísticas: %s

            === CONCEITO DESEJADO ===
            %s

            Responda OBRIGATORIAMENTE em JSON puro (sem markdown, sem explicações extras) no formato:
            {
              "name": "Nome do Personagem ou Monstro",
              "role": "Papel (Ex: Chefe de Ato, Aliado Fiel, Mercador Exótico, Assassino)",
              "description": "Descrição física e ficha com estatísticas (atributos, PV, fraquezas ou habilidades especiais de combate compatíveis com as regras)",
              "personality": "Traços de personalidade, motivações e maneirismos",
              "memory": "Como ele interage ou reage inicialmente ao jogador no mundo"
            }
            """, targetType, challenge, systemName, coreMechanics, statsRules, concept);

        String generatedJson = geminiService.generateContent(
                "Você é um gerador de NPCs e Bosses para RPGs. Responda apenas com o JSON pedido.",
                prompt
        );

        String cleanJson = generatedJson.replaceAll("```json", "").replaceAll("```", "").trim();

        String name = "Novo " + targetType;
        String role = targetType.equalsIgnoreCase("BOSS") ? "Chefe de Ameaça" : "Habitante";
        String description = "Personagem gerado pelo sistema.";
        String personality = "Misterioso e focado em seus objetivos.";
        String memory = "Conheceu o herói nas imediações da jornada.";

        try {
            if (!cleanJson.isBlank()) {
                JsonNode root = objectMapper.readTree(cleanJson);
                if (root.has("name")) name = root.get("name").asText();
                if (root.has("role")) role = root.get("role").asText();
                if (root.has("description")) description = root.get("description").asText();
                if (root.has("personality")) personality = root.get("personality").asText();
                if (root.has("memory")) memory = root.get("memory").asText();
            }
        } catch (Exception e) {
            log.warn("Erro ao fazer parse do JSON do NPC gerado pela IA. Usando valores brutos.", e);
            if (!cleanJson.isBlank()) {
                description = cleanJson;
            }
        }

        Npc npc = Npc.builder()
                .campaign(campaign)
                .name(name)
                .role(role)
                .description(description)
                .personality(personality)
                .memory(memory)
                .isCrystallized(true)
                .build();

        return toDto(npcRepository.save(npc));
    }


    @Transactional
    public NpcDto.Response updateNpc(UUID npcId, NpcDto.UpdateRequest request) {
        Npc npc = npcRepository.findById(npcId)
                .orElseThrow(() -> new IllegalArgumentException("NPC não encontrado: " + npcId));

        if (request.getName() != null && !request.getName().isBlank()) {
            npc.setName(request.getName());
        }
        if (request.getRole() != null) npc.setRole(request.getRole());
        if (request.getDescription() != null) npc.setDescription(request.getDescription());
        if (request.getPersonality() != null) npc.setPersonality(request.getPersonality());
        if (request.getMemory() != null) npc.setMemory(request.getMemory());
        if (request.getIsCrystallized() != null) npc.setIsCrystallized(request.getIsCrystallized());

        return toDto(npcRepository.save(npc));
    }

    @Transactional
    public NpcDto.Response toggleCrystallization(UUID npcId) {
        Npc npc = npcRepository.findById(npcId)
                .orElseThrow(() -> new IllegalArgumentException("NPC não encontrado: " + npcId));

        npc.setIsCrystallized(!Boolean.TRUE.equals(npc.getIsCrystallized()));
        return toDto(npcRepository.save(npc));
    }

    @Transactional
    public void deleteNpc(UUID npcId) {
        npcRepository.deleteById(npcId);
    }

    private NpcDto.Response toDto(Npc entity) {
        return NpcDto.Response.builder()
                .id(entity.getId())
                .campaignId(entity.getCampaign().getId())
                .name(entity.getName())
                .role(entity.getRole())
                .description(entity.getDescription())
                .personality(entity.getPersonality())
                .memory(entity.getMemory())
                .isCrystallized(entity.getIsCrystallized())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}
