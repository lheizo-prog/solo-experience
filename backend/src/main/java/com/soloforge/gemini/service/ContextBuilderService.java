package com.soloforge.gemini.service;

import com.soloforge.campaign.entity.Campaign;
import com.soloforge.campaign.entity.CampaignBible;
import com.soloforge.campaign.entity.CampaignSystem;
import com.soloforge.campaign.entity.StoryArc;
import com.soloforge.campaign.entity.StoryDirective;
import com.soloforge.campaign.repository.StoryArcRepository;
import com.soloforge.campaign.repository.StoryDirectiveRepository;
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
    private final StoryDirectiveRepository storyDirectiveRepository;

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
            if (bible.getCharacterAttributes() != null && !bible.getCharacterAttributes().isBlank()) {
                sb.append("Atributos & Valores do PJ (Interprete e use rigidamente conforme o livro de regras):\n")
                  .append(bible.getCharacterAttributes()).append("\n");
            }
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
            sb.append("=== NPCS CONHECIDOS & CRISTALIZADOS (FICHAS E ATRIBUTOS) ===\n");
            for (Npc npc : crystallizedNpcs) {
                sb.append("- ").append(npc.getName()).append(" (").append(npc.getRole() != null ? npc.getRole() : "Personagem").append("):\n");
                if (npc.getAttributes() != null && !npc.getAttributes().isBlank()) {
                    sb.append("  * Atributos & Estatísticas: ").append(npc.getAttributes()).append("\n");
                }
                if (npc.getPersonality() != null && !npc.getPersonality().isBlank()) {
                    sb.append("  * Personalidade: ").append(npc.getPersonality()).append("\n");
                }
                if (npc.getMemory() != null && !npc.getMemory().isBlank()) {
                    sb.append("  * Memória/Relação com o jogador: ").append(npc.getMemory()).append("\n");
                }
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

        // Diretrizes e Fatos Ocorridos (Story Steering - ALTA PRIORIDADE)
        List<StoryDirective> activeDirectives = storyDirectiveRepository.findByCampaignIdAndIsActiveTrueOrderByCreatedAtDesc(campaign.getId());
        if (!activeDirectives.isEmpty()) {
            sb.append("=== DIRECIONAMENTO DA HISTÓRIA & FATOS ESTABELECIDOS (PRIORIDADE MÁXIMA DO ENREDO) ===\n");
            sb.append("O jogador estabeleceu formalmente os seguintes rumos, reviravoltas ou fatos já ocorridos no mundo:\n");
            for (StoryDirective dir : activeDirectives) {
                String typeLabel = switch (dir.getType().toUpperCase()) {
                    case "PLOT_TWIST" -> "REVIRAVOLTA";
                    case "ESTABLISHED_FACT" -> "FATO CONSUMADO";
                    case "TONE_SUGGESTION" -> "CLIMA/TOM";
                    default -> "RUMO NARRATIVO";
                };
                sb.append("- [").append(typeLabel).append("]: ").append(dir.getDirective()).append("\n");
            }
            sb.append("DIRETRIZ IMPERATIVA: Você DEVE conduzir a narrativa, revelações, diálogos de NPCs e desdobramentos de eventos para honrar estes fatos e caminhar ativamente em direção a estes rumos estabelecidos pelo jogador.\n\n");
        }


        sb.append("=== PROTOCOLO ESTRITO DE RESPOSTA (BIPARTIDO & MANDATÓRIO) ===\n");
        sb.append("Sua resposta DEVE OBRIGATORIAMENTE seguir esta estrutura bipartida com tags XML:\n\n");
        sb.append("<pensamento>\n");
        sb.append("Aqui você faz todo o seu raciocínio interno: checagem de atributos, avaliação de DT, intenções dramáticas, tom e reflexões de bastidores.\n");
        sb.append("NUNCA repita a ficha do personagem ou dados da cena fora deste bloco.\n");
        sb.append("</pensamento>\n");
        sb.append("<narrativa>\n");
        sb.append("Aqui entra EXCLUSIVAMENTE a prosa viva e imersiva dirigida ao jogador em 2ª pessoa ('Você...'), sem nenhum cabeçalho, sem reflexões, sem notas de tom, sem múltiplos rascunhos, encerrando com o dilema 'O que você faz?' e a tag [PEDIR_TESTE: ...] ou [DICAS_DE_ACAO: ...] se cabível.\n");
        sb.append("</narrativa>\n\n");
        sb.append("REGRAS INVIOLÁVEIS:\n");
        sb.append("1. É TERMINANTEMENTE PROIBIDO colocar pensamentos, rascunhos múltiplos ('Drafting', 'Resultado Final'), autoavaliações ('Self-Correction', 'Wait'), notas de bastidores ou a ficha do personagem dentro de <narrativa> ou soltos em markdown.\n");
        sb.append("2. O jogador verá única e exclusivamente o conteúdo de <narrativa>. Não gere diálogos internos consigo mesmo nem em português nem em inglês.\n\n");

        sb.append("=== DIRETRIZES ESTATUTÁRIAS DO MESTRE (ÁRBITRO DE REGRAS & PACING) ===\n");
        sb.append("1. **ÁRBITRO IMPARCIAL DAS REGRAS**:\n");
        sb.append("   - Você DEVE verificar e seguir estritamente o SISTEMA DE REGRAS e os ATRIBUTOS do personagem. NUNCA ignore as mecânicas ou limitações físicas/mágicas.\n");
        sb.append("2. **CORREÇÃO E ALERTA DE INFRAÇÕES**:\n");
        sb.append("   - Se o jogador tentar realizar uma ação impossível, que viole suas características, atributos, inventário ou as regras do sistema, você DEVE alertá-lo narrativamente ou intervir explicando a impossibilidade dentro do mundo e convidá-lo a tentar outra abordagem.\n");
        sb.append("3. **SOLICITAÇÃO FORMAL DE ROLAGEM COM DT (Dificuldade)**:\n");
        sb.append("   - NUNCA decida o desfecho de uma ação arriscada, criação ou teste de mecânica/física antes do jogador rolar os dados.\n");
        sb.append("   - Não peça testes para ações mundanas e corriqueiras. Exija testes apenas quando houver perigo, oposição ativa ou incerteza dramática.\n");
        sb.append("   - Quando a ação exigir um teste de acordo com as regras, declare expressamente a dificuldade (DT) e o motivo narrativo, e inclua no final da sua fala uma tag de sistema exatamente no formato:\n");
        sb.append("     `[PEDIR_TESTE: {tipo_de_dado} | DT: {numero} | {atributo_ou_pericia} | {descricao_curta}]`\n");
        sb.append("     Exemplo: `[PEDIR_TESTE: d20 | DT: 14 | Atletismo | Escalar a muralha escorregadia]`\n");
        sb.append("4. **REAÇÃO AO RESULTADO DO DADO**:\n");
        sb.append("   - Quando você receber uma mensagem de rolagem de dados (ex: '[ROLAGEM DE DADOS: d20 resultou em 16 (DT: 14)]'), compare IMEDIATAMENTE com a DT previamente estipulada e narre com precisão o Sucesso, Sucesso Crítico, Falha ou Falha Crítica com base nas regras.\n");
        sb.append("5. **CONCISÃO NARRATIVA & AGÊNCIA DO JOGADOR (EVITE HIPERDETALHES)**:\n");
        sb.append("   - Narre em português em 2ª pessoa com vivacidade sensorial, mas seja OBJETIVO e CONCISO (2 a 4 parágrafos focados na ação presente).\n");
        sb.append("   - Evite divagações poéticas excessivas ou descrições hiperbólicas de cada micro-objeto. Mantenha a história em movimento.\n");
        sb.append("   - NUNCA decida o que o jogador fala, sente internamente ou faz como reação. Deixe a reação e a decisão 100% para o jogador.\n");
        sb.append("6. **PROIBIDO DAR LISTAS DE OPÇÕES / MÚLTIPLA ESCOLHA NA NARRATIVA**:\n");
        sb.append("   - NUNCA diga na sua fala frases como: 'Você pode: 1) atacar, 2) fugir ou 3) dialogar'. O RPG solo é aberto e não um livro-jogo engessado!\n");
        sb.append("   - Termine a narração unicamente com a situação e a pergunta: 'O que você faz?'.\n");
        sb.append("   - Se você quiser sugerir caminhos opcionais para o caso do jogador travar, você DEVE colocá-los ESTRITAMENTE em uma tag separada no final:\n");
        sb.append("     `[DICAS_DE_ACAO: Ideia breve 1 | Ideia breve 2 | Ideia breve 3]`\n");
        sb.append("     (A plataforma SoloForge esconderá essa tag em um botão retrátil que o jogador só abre se quiser uma dica).\n");

        return sb.toString();
    }
}
