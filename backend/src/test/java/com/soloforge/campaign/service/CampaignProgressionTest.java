package com.soloforge.campaign.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.soloforge.campaign.dto.CampaignDto;
import com.soloforge.campaign.entity.Campaign;
import com.soloforge.campaign.entity.CampaignBible;
import com.soloforge.campaign.entity.CampaignSystem;
import com.soloforge.campaign.repository.CampaignBibleRepository;
import com.soloforge.campaign.repository.CampaignRepository;
import com.soloforge.campaign.repository.CampaignSystemRepository;
import com.soloforge.campaign.repository.StoryArcRepository;
import com.soloforge.campaign.repository.StoryDirectiveRepository;
import com.soloforge.gemini.service.GeminiService;
import com.soloforge.message.repository.MessageRepository;
import com.soloforge.npc.repository.NpcRepository;
import com.soloforge.session.repository.SessionRepository;
import com.soloforge.world.repository.WorldDecisionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CampaignProgressionTest {

    @Mock
    private CampaignRepository campaignRepository;
    @Mock
    private CampaignBibleRepository bibleRepository;
    @Mock
    private CampaignSystemRepository systemRepository;
    @Mock
    private SessionRepository sessionRepository;
    @Mock
    private MessageRepository messageRepository;
    @Mock
    private StoryArcRepository storyArcRepository;
    @Mock
    private NpcRepository npcRepository;
    @Mock
    private WorldDecisionRepository worldDecisionRepository;
    @Mock
    private StoryDirectiveRepository storyDirectiveRepository;
    @Mock
    private GeminiService geminiService;

    private CampaignService campaignService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        campaignService = new CampaignService(
                campaignRepository,
                bibleRepository,
                systemRepository,
                sessionRepository,
                messageRepository,
                storyArcRepository,
                npcRepository,
                worldDecisionRepository,
                storyDirectiveRepository,
                geminiService,
                objectMapper
        );
    }

    @Test
    @DisplayName("Deve avaliar progressão com IA interpretando sistema D20 e sugerindo pontos balanceados")
    void shouldEvaluateProgressionInterpretingD20System() {
        UUID campaignId = UUID.randomUUID();

        CampaignSystem system = CampaignSystem.builder()
                .name("Tormenta20 (D20)")
                .statsAndAttributes("Força, Destreza, Constituição, Inteligência, Sabedoria, Carisma (Escala 10 a 20, bônus a cada 2 pontos).")
                .coreMechanics("D20 + Modificador vs Dificuldade")
                .build();

        CampaignBible bible = CampaignBible.builder()
                .playerCharacter("Guerreiro veterano de guerra")
                .characterAttributes("FOR: 16 (+3)\nDES: 14 (+2)\nCON: 15 (+2)\nINT: 10 (+0)\nSAB: 12 (+1)\nCAR: 8 (-1)")
                .build();

        Campaign campaign = Campaign.builder()
                .id(campaignId)
                .title("Aventuras em Arton")
                .system(system)
                .bible(bible)
                .build();

        when(campaignRepository.findById(campaignId)).thenReturn(Optional.of(campaign));

        String mockAiResponse = """
                {
                  "systemName": "Tormenta20 (D20)",
                  "systemScaleExplanation": "Em sistemas baseados em D20, atributos variam entre 8 e 20. O ganho de 2 pontos representa o avanço clássico de nível.",
                  "situationImpact": "Maior / Subida de Nível",
                  "awardedPoints": 2,
                  "suggestedAllocations": [
                    {
                      "attributeName": "Constituição",
                      "suggestedIncrease": 1,
                      "reasoning": "Resistiu ao veneno da hidra com resiliência física extrema."
                    },
                    {
                      "attributeName": "Força",
                      "suggestedIncrease": 1,
                      "reasoning": "Golpeou os membros da criatura usando espada pesada de duas mãos."
                    }
                  ],
                  "narrativeReasoning": "O combate extenuante exigiu vigor sobre-humano, fortalecendo a musculatura e resistência.",
                  "narrativeNote": "Seus músculos se tornaram mais densos e seu fôlego agora resiste aos piores miasmas."
                }
                """;

        when(geminiService.generateContent(anyString(), anyString())).thenReturn(mockAiResponse);

        CampaignDto.EvaluateProgressionRequest request = new CampaignDto.EvaluateProgressionRequest();
        request.setEventDescription("Derrotou a Hidra do Pântano e subiu de nível");
        request.setProgressionType("LEVEL_UP");

        CampaignDto.ProgressionEvaluationResponse response = campaignService.evaluateCharacterProgression(campaignId, request);

        assertNotNull(response);
        assertEquals("Tormenta20 (D20)", response.getSystemName());
        assertEquals(2, response.getAwardedPoints());
        assertEquals("Maior / Subida de Nível", response.getSituationImpact());
        assertEquals(2, response.getSuggestedAllocations().size());
        assertEquals("Constituição", response.getSuggestedAllocations().get(0).getAttributeName());
        assertEquals(1, response.getSuggestedAllocations().get(0).getSuggestedIncrease());
        assertTrue(response.getSystemScaleExplanation().contains("D20"));
    }

    @Test
    @DisplayName("Deve retornar fallback balanceado caso a resposta da IA venha vazia ou falhe")
    void shouldReturnBalancedFallbackWhenAiFails() {
        UUID campaignId = UUID.randomUUID();

        Campaign campaign = Campaign.builder()
                .id(campaignId)
                .title("Campanha Simples")
                .build();

        when(campaignRepository.findById(campaignId)).thenReturn(Optional.of(campaign));
        when(geminiService.generateContent(anyString(), anyString())).thenReturn("");

        CampaignDto.EvaluateProgressionRequest request = new CampaignDto.EvaluateProgressionRequest();
        request.setEventDescription("Treinou corrida");

        CampaignDto.ProgressionEvaluationResponse response = campaignService.evaluateCharacterProgression(campaignId, request);

        assertNotNull(response);
        assertEquals(1, response.getAwardedPoints());
        assertFalse(response.getSuggestedAllocations().isEmpty());
    }
}
