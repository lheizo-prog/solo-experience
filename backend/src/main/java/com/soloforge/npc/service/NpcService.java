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

        String tier = request.getTier() != null && !request.getTier().isBlank()
                ? request.getTier().toUpperCase()
                : "COMMON";

        Npc npc = Npc.builder()
                .campaign(campaign)
                .name(request.getName())
                .role(request.getRole() != null ? request.getRole() : "Habitante")
                .tier(tier)
                .description(request.getDescription())
                .personality(request.getPersonality())
                .memory(request.getMemory())
                .imageUrl(request.getImageUrl())
                .attributes(request.getAttributes())
                .skills(request.getSkills())
                .combatStrategy(request.getCombatStrategy())
                .isCrystallized(request.getIsCrystallized() != null ? request.getIsCrystallized() : true)
                .build();

        return toDto(npcRepository.save(npc));
    }

    /**
     * Forja um NPC, Mini Boss ou Boss sob medida com base nas regras, tier e mecânicas da campanha
     */
    @Transactional
    public NpcDto.Response generateNpcWithAi(UUID campaignId, NpcDto.GenerateAiRequest req) {
        Campaign campaign = campaignRepository.findById(campaignId)
                .orElseThrow(() -> new IllegalArgumentException("Campanha não encontrada: " + campaignId));

        CampaignSystem system = campaign.getSystem();
        String systemName = system != null ? system.getName() : "Sistema Genérico";
        String coreMechanics = system != null && system.getCoreMechanics() != null ? system.getCoreMechanics() : "D20 padrão";
        String statsRules = system != null && system.getStatsAndAttributes() != null ? system.getStatsAndAttributes() : "Atributos D20";

        String requestedTier = req.getTier();
        if (requestedTier == null || requestedTier.isBlank()) {
            if ("BOSS".equalsIgnoreCase(req.getType())) {
                requestedTier = "BOSS";
            } else if ("RIVAL".equalsIgnoreCase(req.getType())) {
                requestedTier = "MINI_BOSS";
            } else {
                requestedTier = "COMMON";
            }
        } else {
            requestedTier = requestedTier.toUpperCase();
        }

        String challenge = req.getChallengeLevel() != null && !req.getChallengeLevel().isBlank() ? req.getChallengeLevel().toUpperCase() : "MÉDIO";
        String concept = req.getConcept() != null && !req.getConcept().isBlank() ? req.getConcept() : "Um encontro memorável e desafiador para o jogador";

        String tierInstructions = switch (requestedTier) {
            case "BOSS" -> """
                CATEGORIA: GRANDE CHEFE / BOSS ÉPICO DE ATO
                - "attributes": APENAS números e dados vitais essenciais do sistema (ex: FOR: 18 (+4) | DES: 14 (+2) | CON: 18 (+4) | PV: 180/180 | CA: 18 | Ki/Mana: 40). NUNCA coloque textos de golpes ou fases aqui.
                - "skills": Técnicas, magias ou golpes devastadores com custo e efeito (Ex: Golpe Esmagador: 0 Ki (Dano FOR x 2) | Tempestade Arcana: 10 Mana (3d8 em área) | Contra-Golpe de Aço).
                - "combatStrategy": Estrutura épica de combate contendo:
                  * FASE 1 (100% a 50% PV): Postura inicial e padrão de ação.
                  * FASE 2 (49% a 0% PV): Gatilho de fúria/transformação e bônus.
                  * HABILIDADE ESPECIAL (Último suspiro, persistência ou reação destrutiva).
                  * FRAQUEZA TÁTICA: Pelo menos uma fraqueza explícita para o jogador explorar narrativamente.
                """;
            case "MINI_BOSS" -> """
                CATEGORIA: MINI BOSS / INIMIGO DE ELITE / RIVAL
                - "attributes": Atributos reforçados cerca de +30% superiores a um humano comum, com PV expandido (Ex: FOR: 16 (+3) | DES: 14 (+2) | PV: 65/65 | CA: 16). APENAS números e dados vitais.
                - "skills": 2 a 3 técnicas de assinatura perigosas com custos e efeitos claros.
                - "combatStrategy": Padrão de combate tático, gatilho de reação/desespero quando estiver abaixo de 50% de PV, e uma FRAQUEZA TÁTICA CLARA que recompense a inteligência do jogador.
                """;
            default -> """
                CATEGORIA: NPC COMUM / ALIADO / HABITANTE
                - "attributes": Atributos numéricos equilibrados na mesma escala de um personagem jogador iniciante (Ex: FOR: 10 (+0) | DES: 12 (+1) | PV: 18/18 | CA: 12).
                - "skills": 1 ataque básico ou 1 perícia de utilidade social/ofício (Ex: Adaga: 1d4+1 | Negociação +3).
                - "combatStrategy": Comportamento simples em combate (Ex: Não é guerreiro; busca abrigo, negocia ou foge se ameaçado).
                """;
        };

        String prompt = String.format("""
            Você é um Game Master e Designer de Monstros/NPCs para RPGs de Mesa.
            Crie um personagem totalmente coerente com as regras e atributos do sistema abaixo.
            Tier do Personagem: %s
            Desafio / Grau de Ameaça: %s

            === DIRETRIZES DA CATEGORIA (%s) ===
            %s

            === SISTEMA DE REGRAS DA CAMPANHA ===
            Nome: %s
            Mecânicas Centrais: %s
            Regras de Atributos/Estatísticas: %s

            === CONCEITO DESEJADO ===
            %s

            Responda OBRIGATORIAMENTE em JSON puro (sem markdown ao redor, sem explicações extras) no formato:
            {
              "name": "Nome do Personagem ou Monstro",
              "role": "Papel (Ex: Chefe de Ato, Aliado Fiel, Mercador Exótico, Assassino)",
              "attributes": "Apenas números e estatísticas vitais formatados (Ex: FOR: 16 | DES: 14 | PV: 40 | CA: 15)",
              "skills": "Técnicas, magias ou golpes com custo e efeito",
              "combatStrategy": "Padrão de combate, fases e fraquezas",
              "description": "Descrição física e aparência do personagem",
              "personality": "Traços de personalidade, motivações e maneirismos",
              "memory": "Como ele interage ou reage inicialmente ao jogador no mundo"
            }
            """, requestedTier, challenge, requestedTier, tierInstructions, systemName, coreMechanics, statsRules, concept);

        String generatedJson = geminiService.generateContent(
                "Você é um gerador de NPCs, Mini Bosses e Chefes Épicos para RPGs. Responda apenas com o JSON pedido.",
                prompt
        );

        String cleanJson = JsonExtractor.extractJsonObject(generatedJson);

        String name = "Novo " + requestedTier;
        String role = requestedTier.equalsIgnoreCase("BOSS") ? "Chefe de Ameaça" : requestedTier.equalsIgnoreCase("MINI_BOSS") ? "Inimigo de Elite" : "Habitante";
        String description = "Personagem gerado pelo sistema.";
        String attributes = "Atributos padrão";
        String skills = "";
        String combatStrategy = "";
        String personality = "Misterioso e focado em seus objetivos.";
        String memory = "Conheceu o herói nas imediações da jornada.";

        try {
            if (!cleanJson.isBlank()) {
                JsonNode root = objectMapper.readTree(cleanJson);
                if (root.has("name")) name = root.get("name").asText();
                if (root.has("role")) role = root.get("role").asText();
                if (root.has("description")) description = root.get("description").asText();
                if (root.has("attributes")) attributes = root.get("attributes").asText();
                if (root.has("skills")) skills = root.get("skills").asText();
                if (root.has("combatStrategy")) combatStrategy = root.get("combatStrategy").asText();
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
                .tier(requestedTier)
                .description(description)
                .attributes(attributes)
                .skills(skills)
                .combatStrategy(combatStrategy)
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

        if (!npc.getCampaign().getId().equals(campaignId)) {
            throw new IllegalArgumentException("O NPC não pertence à campanha especificada: " + campaignId);
        }

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
    public NpcDto.Response updateNpc(UUID campaignId, UUID npcId, NpcDto.UpdateRequest request) {
        Npc npc = npcRepository.findById(npcId)
                .orElseThrow(() -> new IllegalArgumentException("NPC não encontrado: " + npcId));

        if (!npc.getCampaign().getId().equals(campaignId)) {
            throw new IllegalArgumentException("O NPC não pertence à campanha especificada: " + campaignId);
        }

        if (request.getName() != null && !request.getName().isBlank()) {
            npc.setName(request.getName());
        }
        if (request.getRole() != null) npc.setRole(request.getRole());
        if (request.getDescription() != null) npc.setDescription(request.getDescription());
        if (request.getPersonality() != null) npc.setPersonality(request.getPersonality());
        if (request.getMemory() != null) npc.setMemory(request.getMemory());
        if (request.getImageUrl() != null) npc.setImageUrl(request.getImageUrl());
        if (request.getAttributes() != null) npc.setAttributes(request.getAttributes());
        if (request.getSkills() != null) npc.setSkills(request.getSkills());
        if (request.getCombatStrategy() != null) npc.setCombatStrategy(request.getCombatStrategy());
        if (request.getTier() != null && !request.getTier().isBlank()) npc.setTier(request.getTier().toUpperCase());
        if (request.getIsCrystallized() != null) npc.setIsCrystallized(request.getIsCrystallized());

        return toDto(npcRepository.save(npc));
    }

    @Transactional
    public NpcDto.Response toggleCrystallization(UUID campaignId, UUID npcId) {
        Npc npc = npcRepository.findById(npcId)
                .orElseThrow(() -> new IllegalArgumentException("NPC não encontrado: " + npcId));

        if (!npc.getCampaign().getId().equals(campaignId)) {
            throw new IllegalArgumentException("O NPC não pertence à campanha especificada: " + campaignId);
        }

        npc.setIsCrystallized(!Boolean.TRUE.equals(npc.getIsCrystallized()));
        return toDto(npcRepository.save(npc));
    }

    @Transactional
    public void deleteNpc(UUID campaignId, UUID npcId) {
        Npc npc = npcRepository.findById(npcId)
                .orElseThrow(() -> new IllegalArgumentException("NPC não encontrado: " + npcId));

        if (!npc.getCampaign().getId().equals(campaignId)) {
            throw new IllegalArgumentException("O NPC não pertence à campanha especificada: " + campaignId);
        }

        npcRepository.delete(npc);
    }

    private NpcDto.Response toDto(Npc entity) {
        return NpcDto.Response.builder()
                .id(entity.getId())
                .campaignId(entity.getCampaign().getId())
                .name(entity.getName())
                .role(entity.getRole())
                .tier(entity.getTier())
                .description(entity.getDescription())
                .personality(entity.getPersonality())
                .memory(entity.getMemory())
                .imageUrl(entity.getImageUrl())
                .attributes(entity.getAttributes())
                .skills(entity.getSkills())
                .combatStrategy(entity.getCombatStrategy())
                .isCrystallized(entity.getIsCrystallized())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}
