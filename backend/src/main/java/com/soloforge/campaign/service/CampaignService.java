package com.soloforge.campaign.service;

import com.soloforge.campaign.dto.CampaignDto;
import com.soloforge.campaign.entity.Campaign;
import com.soloforge.campaign.entity.CampaignBible;
import com.soloforge.campaign.entity.CampaignSystem;
import com.soloforge.campaign.repository.CampaignBibleRepository;
import com.soloforge.campaign.repository.CampaignRepository;
import com.soloforge.campaign.repository.CampaignSystemRepository;
import com.soloforge.session.entity.Session;
import com.soloforge.session.repository.SessionRepository;
import com.soloforge.campaign.repository.StoryArcRepository;
import com.soloforge.message.entity.Message;
import com.soloforge.message.repository.MessageRepository;
import com.soloforge.campaign.repository.StoryDirectiveRepository;
import com.soloforge.npc.repository.NpcRepository;
import com.soloforge.world.repository.WorldDecisionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.soloforge.common.util.JsonExtractor;
import com.soloforge.gemini.service.GeminiService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class CampaignService {

    private final CampaignRepository campaignRepository;
    private final CampaignBibleRepository bibleRepository;
    private final CampaignSystemRepository systemRepository;
    private final SessionRepository sessionRepository;
    private final MessageRepository messageRepository;
    private final StoryArcRepository storyArcRepository;
    private final NpcRepository npcRepository;
    private final WorldDecisionRepository worldDecisionRepository;
    private final StoryDirectiveRepository storyDirectiveRepository;
    private final GeminiService geminiService;
    private final ObjectMapper objectMapper;

    @Transactional
    public CampaignDto.Response createCampaign(CampaignDto.CreateRequest request) {
        Campaign campaign = Campaign.builder()
                .title(request.getTitle())
                .synopsis(request.getSynopsis())
                .genre(request.getGenre())
                .build();

        CampaignBible bible = CampaignBible.builder()
                .campaign(campaign)
                .worldLore(request.getWorldLore())
                .toneAndStyle(request.getToneAndStyle())
                .playerCharacter(request.getPlayerCharacter())
                .characterAttributes(request.getCharacterAttributes())
                .keyThemes(request.getKeyThemes())
                .build();

        CampaignSystem system = CampaignSystem.builder()
                .campaign(campaign)
                .name(request.getSystemName() != null ? request.getSystemName() : "SoloForge D20 Narrativo")
                .coreMechanics(request.getCoreMechanics() != null ? request.getCoreMechanics() : 
                        "1. Toda ação com risco ou oposição requer rolagem de dados (d20).\n" +
                        "2. O Mestre sempre estipula previamente a Dificuldade do Teste (DT): Muito Fácil (5), Fácil (10), Médio (15), Difícil (20), Quase Impossível (25).\n" +
                        "3. Ações que desrespeitam a física do mundo, o inventário atual ou as fraquezas do PJ são imediatamente barradas ou alertadas pelo Mestre.")
                .statsAndAttributes(request.getStatsAndAttributes() != null ? request.getStatsAndAttributes() :
                        "Atributos (modificadores de -1 a +5): Força, Destreza, Constituição, Inteligência, Sabedoria, Carisma.")
                .rollInstructions(request.getRollInstructions() != null ? request.getRollInstructions() :
                        "Quando uma ação incerta ocorrer, o Mestre emite a tag `[PEDIR_TESTE: d20 | DT: X | Atributo | Motivo]`. O jogador clica no botão de rolagem gerado pela interface e o Mestre julga o desfecho.")
                .build();


        campaign.setBible(bible);
        campaign.setSystem(system);

        Campaign saved = campaignRepository.save(campaign);

        // Cria a primeira sessão inaugural automaticamente
        Session initialSession = Session.builder()
                .campaign(saved)
                .sessionNumber(1)
                .title("Ato I: O Despertar da Jornada")
                .summary("Início da crônica.")
                .build();
        sessionRepository.save(initialSession);

        return toDto(saved);
    }

    @Transactional(readOnly = true)
    public List<CampaignDto.Response> listAllCampaigns() {
        return campaignRepository.findAll().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public CampaignDto.Response getCampaignById(UUID id) {
        Campaign campaign = campaignRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Campanha não encontrada com id: " + id));
        return toDto(campaign);
    }

    @Transactional
    public CampaignDto.Response updateBible(UUID campaignId, CampaignDto.UpdateBibleRequest request) {
        Campaign campaign = campaignRepository.findById(campaignId)
                .orElseThrow(() -> new IllegalArgumentException("Campanha não encontrada: " + campaignId));

        CampaignBible bible = campaign.getBible();
        if (bible == null) {
            bible = CampaignBible.builder().campaign(campaign).build();
        }

        bible.setWorldLore(request.getWorldLore());
        bible.setToneAndStyle(request.getToneAndStyle());
        bible.setPlayerCharacter(request.getPlayerCharacter());
        bible.setCharacterAttributes(request.getCharacterAttributes());
        bible.setKeyThemes(request.getKeyThemes());

        bibleRepository.save(bible);
        campaign.setBible(bible);

        return toDto(campaign);
    }

    @Transactional
    public CampaignDto.Response updateSystem(UUID campaignId, CampaignDto.UpdateSystemRequest request) {
        Campaign campaign = campaignRepository.findById(campaignId)
                .orElseThrow(() -> new IllegalArgumentException("Campanha não encontrada: " + campaignId));

        CampaignSystem system = campaign.getSystem();
        if (system == null) {
            system = CampaignSystem.builder().campaign(campaign).build();
        }

        if (request.getName() != null) system.setName(request.getName());
        system.setCoreMechanics(request.getCoreMechanics());
        system.setStatsAndAttributes(request.getStatsAndAttributes());
        system.setRollInstructions(request.getRollInstructions());

        systemRepository.save(system);
        campaign.setSystem(system);

        return toDto(campaign);
    }

    @Transactional
    public void deleteCampaign(UUID campaignId) {
        Campaign campaign = campaignRepository.findById(campaignId)
                .orElseThrow(() -> new IllegalArgumentException("Campanha não encontrada: " + campaignId));

        // 1. Remove mensagens de todas as sessões da campanha
        List<Session> sessions = sessionRepository.findByCampaignIdOrderBySessionNumberAsc(campaignId);
        for (Session session : sessions) {
            List<Message> msgs = messageRepository.findBySessionIdOrderByCreatedAtAsc(session.getId());
            messageRepository.deleteAll(msgs);
        }

        // 2. Remove sessões da campanha
        sessionRepository.deleteAll(sessions);

        // 3. Remove Arcos Narrativos
        storyArcRepository.deleteAll(storyArcRepository.findByCampaignIdOrderByCreatedAtDesc(campaignId));

        // 4. Remove NPCs
        npcRepository.deleteAll(npcRepository.findByCampaignId(campaignId));

        // 5. Remove Decisões do Mundo
        worldDecisionRepository.deleteAll(worldDecisionRepository.findByCampaignIdOrderByCreatedAtDesc(campaignId));

        // 6. Remove Diretrizes de História / Fatos
        storyDirectiveRepository.deleteAll(storyDirectiveRepository.findByCampaignIdOrderByCreatedAtDesc(campaignId));

        // 7. Remove a Campanha (Bíblia e Sistema com CascadeType.ALL serão excluídos juntos)
        campaignRepository.delete(campaign);
    }

    /**
     * Avalia a progressão de atributos do personagem interpretando as regras e escalas do sistema da campanha com a IA.
     */
    @Transactional(readOnly = true)
    public CampaignDto.ProgressionEvaluationResponse evaluateCharacterProgression(UUID campaignId, CampaignDto.EvaluateProgressionRequest req) {
        Campaign campaign = campaignRepository.findById(campaignId)
                .orElseThrow(() -> new IllegalArgumentException("Campanha não encontrada: " + campaignId));

        CampaignSystem system = campaign.getSystem();
        CampaignBible bible = campaign.getBible();

        String systemName = system != null && system.getName() != null && !system.getName().isBlank() 
                ? system.getName() : "Sistema Customizado / D20";
        String statsRules = system != null && system.getStatsAndAttributes() != null && !system.getStatsAndAttributes().isBlank() 
                ? system.getStatsAndAttributes() : "Atributos D20 convencionais (1-20, média 10, bônus a cada 2 pontos).";
        String coreMechanics = system != null && system.getCoreMechanics() != null && !system.getCoreMechanics().isBlank() 
                ? system.getCoreMechanics() : "Resolução de testes com dados contra Dificuldade (DT).";
        String currentAttributes = bible != null && bible.getCharacterAttributes() != null && !bible.getCharacterAttributes().isBlank() 
                ? bible.getCharacterAttributes() : "FOR: 10 | DES: 10 | CON: 10 | INT: 10 | SAB: 10 | CAR: 10";
        String characterDescription = bible != null && bible.getPlayerCharacter() != null && !bible.getPlayerCharacter().isBlank() 
                ? bible.getPlayerCharacter() : "Protagonista";

        String prompt = String.format("""
            Você é um Árbitro e Matemático de RPG especialista em balanceamento, escalas numéricas e progressão de personagens.
            O jogador vivenciou um evento ou marco narrativo em sua campanha e busca a evolução de seus atributos.
            Sua missão é LER o sistema de regras específico desta campanha, INTERPRETAR a sua escala numérica e CALCULAR a quantidade justa de pontos de atributo conquistados.

            === SISTEMA DE REGRAS DA CAMPANHA ===
            Nome do Sistema: %s
            Escala e Regras de Atributos:
            %s
            Mecânicas Centrais:
            %s

            === FICHA ATUAL DO PROTAGONISTA ===
            Conceito: %s
            Atributos Atuais:
            %s

            === EVENTO / CONQUISTA OCORRIDA ===
            %s
            Tipo de Marco: %s

            === DIRETRIZES FUNDAMENTAIS DE ESCALA ===
            1. RESPEITE A ESCALA NUMÉRICA DO SISTEMA:
               - Em sistemas D20 (D&D, Tormenta20, Pathfinder): Atributos variam de 8 a 20. Marcos grandes concedem no máximo 1 a 2 pontos de atributo no total! Jamais conceda 5 ou 10 pontos em D20.
               - Em sistemas D100 / Percentual (Call of Cthulhu, BRP): Atributos e perícias variam de 1 a 100%%. Ganhos variam entre 3 e 8 pontos percentuais.
               - Em sistemas Storyteller (Vampiro, World of Darkness): Atributos vão de 1 a 5 pontos. Conceda 1 ponto somente em marcos épicos.
               - Em sistemas Solo Leveling / RPG Numérico / LitRPG: Se o sistema prevê pontos por nível, conceda 3 a 5 pontos livres.
               - Em sistemas Customizados: Extraia a escala e limites do texto de regras acima.
            2. CALCULE A QUANTIDADE DE PONTOS LIVRES:
               - Defina 'awardedPoints' como o total exato de pontos que o jogador terá para alocar.
            3. SUGIRA UMA DISTRIBUIÇÃO COERENTE (Caso o jogador queira consultar sua recomendação):
               - Sugira como esses 'awardedPoints' poderiam ser distribuídos com base no que aconteceu no evento (ex: se lutou com força bruta, sugira Força; se estudou magia, sugira Inteligência/Sabedoria).

            Responda OBRIGATORIAMENTE em JSON puro (sem markdown ```json):
            {
              "systemName": "%s",
              "systemScaleExplanation": "Explicação concisa de como a escala deste sistema funciona e porque este valor de pontos é matematicamente equilibrado",
              "situationImpact": "Menor / Moderado / Maior / Épico",
              "awardedPoints": 2,
              "suggestedAllocations": [
                {
                  "attributeName": "Nome do Atributo",
                  "suggestedIncrease": 1,
                  "reasoning": "Por que este aumento reflete a narrativa do evento"
                }
              ],
              "narrativeReasoning": "Resumo da análise do evento e como ele moldou o crescimento do personagem",
              "narrativeNote": "Frase imersiva em estilo crônica registrando o avanço do herói"
            }
            """, systemName, statsRules, coreMechanics, characterDescription, currentAttributes,
                req.getEventDescription(), req.getProgressionType() != null ? req.getProgressionType() : "Geral", systemName);

        String generatedJson = geminiService.generateContent(
                "Você é um árbitro de RPG sênior que calcula pontos de evolução respeitando a escala matemática do sistema. Responda apenas com o JSON pedido.",
                prompt
        );

        String cleanJson = JsonExtractor.extractJsonObject(generatedJson);

        try {
            if (!cleanJson.isBlank()) {
                var responseNode = objectMapper.readTree(cleanJson);
                List<CampaignDto.AttributeProgressionSuggestion> suggestions = new ArrayList<>();
                if (responseNode.has("suggestedAllocations") && responseNode.get("suggestedAllocations").isArray()) {
                    for (var sNode : responseNode.get("suggestedAllocations")) {
                        suggestions.add(CampaignDto.AttributeProgressionSuggestion.builder()
                                .attributeName(sNode.path("attributeName").asText("Atributo"))
                                .suggestedIncrease(sNode.path("suggestedIncrease").asInt(1))
                                .reasoning(sNode.path("reasoning").asText())
                                .build());
                    }
                }

                return CampaignDto.ProgressionEvaluationResponse.builder()
                        .systemName(responseNode.path("systemName").asText(systemName))
                        .systemScaleExplanation(responseNode.path("systemScaleExplanation").asText("Escala avaliada com base nas regras do sistema."))
                        .situationImpact(responseNode.path("situationImpact").asText("Moderado"))
                        .awardedPoints(Math.max(1, responseNode.path("awardedPoints").asInt(1)))
                        .suggestedAllocations(suggestions)
                        .narrativeReasoning(responseNode.path("narrativeReasoning").asText("Avanço conquistado pelas ações na história."))
                        .narrativeNote(responseNode.path("narrativeNote").asText("O herói fortaleceu suas capacidades."))
                        .build();
            }
        } catch (Exception e) {
            log.warn("Erro ao fazer parse da resposta de progressão da IA: {}. Usando fallback balanceado.", e.getMessage());
        }

        // Fallback balanceado caso a IA esteja offline ou o JSON falhe
        return CampaignDto.ProgressionEvaluationResponse.builder()
                .systemName(systemName)
                .systemScaleExplanation("Avaliação padrão: 1 ponto de atributo para marco narrativo.")
                .situationImpact("Moderado")
                .awardedPoints(1)
                .suggestedAllocations(List.of(
                        CampaignDto.AttributeProgressionSuggestion.builder()
                                .attributeName("Principal Atributo")
                                .suggestedIncrease(1)
                                .reasoning("Aumento padrão pelo esforço no evento.")
                                .build()
                ))
                .narrativeReasoning("O personagem evoluiu através de suas provações.")
                .narrativeNote("Um passo adiante na jornada do herói.")
                .build();
    }

    public CampaignDto.Response toDto(Campaign entity) {
        CampaignDto.BibleResponse bibleDto = null;
        if (entity.getBible() != null) {
            bibleDto = CampaignDto.BibleResponse.builder()
                    .id(entity.getBible().getId())
                    .worldLore(entity.getBible().getWorldLore())
                    .toneAndStyle(entity.getBible().getToneAndStyle())
                    .playerCharacter(entity.getBible().getPlayerCharacter())
                    .characterAttributes(entity.getBible().getCharacterAttributes())
                    .keyThemes(entity.getBible().getKeyThemes())
                    .build();
        }

        CampaignDto.SystemResponse systemDto = null;
        if (entity.getSystem() != null) {
            systemDto = CampaignDto.SystemResponse.builder()
                    .id(entity.getSystem().getId())
                    .name(entity.getSystem().getName())
                    .coreMechanics(entity.getSystem().getCoreMechanics())
                    .statsAndAttributes(entity.getSystem().getStatsAndAttributes())
                    .rollInstructions(entity.getSystem().getRollInstructions())
                    .build();
        }

        return CampaignDto.Response.builder()
                .id(entity.getId())
                .title(entity.getTitle())
                .synopsis(entity.getSynopsis())
                .genre(entity.getGenre())
                .bible(bibleDto)
                .system(systemDto)
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
