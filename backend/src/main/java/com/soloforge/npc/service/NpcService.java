package com.soloforge.npc.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.soloforge.campaign.entity.Campaign;
import com.soloforge.campaign.entity.CampaignSystem;
import com.soloforge.campaign.repository.CampaignRepository;
import com.soloforge.common.util.JsonExtractor;
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
                .imageUrl(request.getImageUrl())
                .attributes(request.getAttributes())
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
              "description": "Descrição física e lore do personagem",
              "attributes": "Atributos e estatísticas formatados de forma limpa compatíveis com as regras (Ex: FOR: 18 | DES: 14 | CON: 16 | PV: 60/60 | CA: 17 | Habilidade: Rajada Sombria)",
              "personality": "Traços de personalidade, motivações e maneirismos",
              "memory": "Como ele interage ou reage inicialmente ao jogador no mundo"
            }
            """, targetType, challenge, systemName, coreMechanics, statsRules, concept);

        String generatedJson = geminiService.generateContent(
                "Você é um gerador de NPCs e Bosses para RPGs. Responda apenas com o JSON pedido.",
                prompt
        );

        String cleanJson = JsonExtractor.extractJsonObject(generatedJson);

        String name = "Novo " + targetType;
        String role = targetType.equalsIgnoreCase("BOSS") ? "Chefe de Ameaça" : "Habitante";
        String description = "Personagem gerado pelo sistema.";
        String attributes = "Atributos padrão";
        String personality = "Misterioso e focado em seus objetivos.";
        String memory = "Conheceu o herói nas imediações da jornada.";

        try {
            if (!cleanJson.isBlank()) {
                JsonNode root = objectMapper.readTree(cleanJson);
                if (root.has("name")) name = root.get("name").asText();
                if (root.has("role")) role = root.get("role").asText();
                if (root.has("description")) description = root.get("description").asText();
                if (root.has("attributes")) attributes = root.get("attributes").asText();
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
                .attributes(attributes)
                .imageUrl(req.getImageUrl())
                .personality(personality)
                .memory(memory)
                .isCrystallized(true)
                .build();

        return toDto(npcRepository.save(npc));
    }

    /**
     * Evolui os atributos e histórico de um NPC baseado em eventos narrativos e regras do sistema
     */
    @Transactional
    public NpcDto.Response evolveNpcWithAi(UUID campaignId, UUID npcId, NpcDto.EvolveRequest req) {
        Npc npc = npcRepository.findById(npcId)
                .orElseThrow(() -> new IllegalArgumentException("NPC não encontrado: " + npcId));

        Campaign campaign = npc.getCampaign();
        CampaignSystem system = campaign.getSystem();
        String systemName = system != null ? system.getName() : "Sistema Genérico";
        String statsRules = system != null && system.getStatsAndAttributes() != null ? system.getStatsAndAttributes() : "Atributos D20";

        String prompt = String.format("""
            Você é um Mestre de RPG especialista em balanceamento e progressão de personagens.
            O NPC abaixo passou por um evento marcante na narrativa.
            Atualize seus atributos, estatísticas de combate e memórias de acordo com as consequências desse evento, respeitando as regras do sistema.

            === SISTEMA DE REGRAS ===
            Nome: %s
            Regras de Atributos: %s

            === NPC ATUAL ===
            Nome: %s (%s)
            Descrição: %s
            Atributos Atuais: %s
            Personalidade: %s
            Memória Atual: %s

            === EVENTO OCORRIDO ===
            %s

            Analise se o evento confere:
            - Aumento de atributos/nível/poder (ex: subir de classe, adquirir novas magias/itens)
            - Danos permanentes, cicatrizes, perdas de membros ou maldições
            - Mudança de humor, ambição ou aliança com o jogador

            Responda OBRIGATORIAMENTE em JSON puro (sem markdown) no formato:
            {
              "updatedAttributes": "Atributos recalculados e atualizados (mantendo formato limpo com barras horizontais |)",
              "updatedMemory": "Resumo atualizado da memória e relação com o jogador pós-evento",
              "narrativeNote": "Uma frase resumindo o impacto da evolução (ex: 'Após sobreviver à forja rúnica, sua força cresceu e sua pele agora irradia chamas azuis.')"
            }
            """, systemName, statsRules, npc.getName(), npc.getRole(), npc.getDescription(),
                npc.getAttributes() != null ? npc.getAttributes() : "Nenhum atributo cadastrado",
                npc.getPersonality(), npc.getMemory(), req.getEventDescription());

        String generatedJson = geminiService.generateContent(
                "Você é um árbitro de RPG que evolui fichas de NPCs de forma lógica. Responda apenas com o JSON pedido.",
                prompt
        );

        String cleanJson = JsonExtractor.extractJsonObject(generatedJson);

        try {
            if (!cleanJson.isBlank()) {
                JsonNode root = objectMapper.readTree(cleanJson);
                if (root.has("updatedAttributes")) {
                    npc.setAttributes(root.get("updatedAttributes").asText());
                }
                if (root.has("updatedMemory")) {
                    npc.setMemory(root.get("updatedMemory").asText());
                }
                if (root.has("narrativeNote")) {
                    String note = root.get("narrativeNote").asText();
                    if (npc.getDescription() != null) {
                        npc.setDescription(npc.getDescription() + "\n\n[Evolução]: " + note);
                    } else {
                        npc.setDescription("[Evolução]: " + note);
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Erro ao fazer parse da evolução do NPC pela IA. Mantendo atributos anteriores.", e);
        }

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
        if (request.getImageUrl() != null) npc.setImageUrl(request.getImageUrl());
        if (request.getAttributes() != null) npc.setAttributes(request.getAttributes());
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
                .imageUrl(entity.getImageUrl())
                .attributes(entity.getAttributes())
                .isCrystallized(entity.getIsCrystallized())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}
