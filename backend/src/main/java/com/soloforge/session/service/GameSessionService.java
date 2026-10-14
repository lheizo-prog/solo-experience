package com.soloforge.session.service;

import com.soloforge.campaign.entity.Campaign;
import com.soloforge.campaign.repository.CampaignRepository;
import com.soloforge.gemini.service.ContextBuilderService;
import com.soloforge.gemini.service.GeminiService;
import com.soloforge.message.entity.Message;
import com.soloforge.message.repository.MessageRepository;
import com.soloforge.session.dto.SessionDto;
import com.soloforge.session.entity.Session;
import com.soloforge.session.repository.SessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class GameSessionService {

    private final SessionRepository sessionRepository;
    private final MessageRepository messageRepository;
    private final CampaignRepository campaignRepository;
    private final ContextBuilderService contextBuilderService;
    private final GeminiService geminiService;

    @Transactional(readOnly = true)
    public List<SessionDto.SessionResponse> getSessionsByCampaign(UUID campaignId) {
        return sessionRepository.findByCampaignIdOrderBySessionNumberAsc(campaignId).stream()
                .map(this::toSessionDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<SessionDto.MessageResponse> getMessagesBySession(UUID sessionId) {
        return messageRepository.findBySessionIdOrderByCreatedAtAsc(sessionId).stream()
                .map(this::toMessageDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public SessionDto.SessionResponse createNextSession(UUID campaignId, String title) {
        Campaign campaign = campaignRepository.findById(campaignId)
                .orElseThrow(() -> new IllegalArgumentException("Campanha não encontrada"));

        int nextNumber = sessionRepository.findFirstByCampaignIdOrderBySessionNumberDesc(campaignId)
                .map(s -> s.getSessionNumber() + 1)
                .orElse(1);

        Session session = Session.builder()
                .campaign(campaign)
                .sessionNumber(nextNumber)
                .title(title != null && !title.isBlank() ? title : "Ato " + nextNumber)
                .build();

        return toSessionDto(sessionRepository.save(session));
    }

    public SessionDto.SessionResponse concludeSession(UUID sessionId) {
        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("Sessão não encontrada: " + sessionId));

        List<Message> messages = messageRepository.findBySessionIdOrderByCreatedAtAsc(sessionId);
        
        // Solicita ao Gemini para gerar um resumo crônico épico e estruturado de "Fim de Episódio"
        String summary = "Sessão concluída.";
        if (!messages.isEmpty()) {
            StringBuilder conversationText = new StringBuilder();
            for (Message m : messages) {
                conversationText.append(m.getSenderName() != null ? m.getSenderName() : m.getSender())
                        .append(": ")
                        .append(m.getContent())
                        .append("\n");
            }

            String summaryPrompt = """
Você é o Cronista Mestre e Narrador Épico do SoloForge.
A conversa a seguir representa um episódio/ato completo de uma crônica de RPG solo.
Crie um fechamento triunfante com a autêntica essência de "FIM DE EPISÓDIO / FIM DE ARCO" (como nos melhores animes, séries e crônicas de fantasia).

Gere a resposta rigorosamente no seguinte formato estruturado em Markdown:

# Ato %d: [Título Épico do Episódio / Ato]

## 📜 Crônica dos Acontecimentos
(Um parágrafo vívido, épico e dramático recapitulando os feitos do protagonista, o tom da jornada e o clímax vivenciado nesta sessão.)

## ⚔️ Feitos, Decisões & Conquistas
- **Provações & Combates**: (Inimigos superados, testes decisivos ou perigos enfrentados)
- **Decisões do Protagonista**: (Escolhas morais, táticas ou alianças que mudaram o rumo da história)
- **Descobertas & Recompensas**: (Itens, pistas, segredos ou reputação adquirida)

## 🔮 No Próximo Episódio...
(Uma frase instigante, misteriosa ou profética gerando gancho/cliffhanger para o próximo ato.)

=== DIÁLOGO DA SESSÃO ===
%s
""".formatted(session.getSessionNumber(), conversationText.toString());

            summary = geminiService.generateStoryResponse(
                    "Você é o Cronista Mestre do SoloForge. Crie crônicas de encerramento de episódio memoráveis, épicas e estruturadas em Markdown.",
                    List.of(Map.of("role", "PLAYER", "text", summaryPrompt))
            );
        }

        return saveSessionSummaryAndCreateNext(sessionId, summary);
    }

    @Transactional
    public SessionDto.SessionResponse saveSessionSummaryAndCreateNext(UUID sessionId, String summary) {
        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("Sessão não encontrada: " + sessionId));
        session.setSummary(summary);

        // Extrai o título épico da primeira linha (ex: "# Ato 2: O Despertar das Cinzas") para enriquecer a sessão
        if (summary != null && !summary.isBlank()) {
            String firstLine = summary.lines().findFirst().orElse("").trim();
            if (firstLine.startsWith("#")) {
                String cleanTitle = firstLine.replaceFirst("^#+\\s*", "").trim();
                if (cleanTitle.length() > 140) {
                    cleanTitle = cleanTitle.substring(0, 140);
                }
                if (!cleanTitle.isBlank()) {
                    session.setTitle(cleanTitle);
                }
            }
        }

        Session saved = sessionRepository.save(session);

        Campaign campaign = session.getCampaign();
        int nextNumber = session.getSessionNumber() + 1;
        Session nextSession = Session.builder()
                .campaign(campaign)
                .sessionNumber(nextNumber)
                .title("Ato " + nextNumber)
                .build();
        sessionRepository.save(nextSession);

        return toSessionDto(saved);
    }

    public SessionDto.MessageResponse sendPlayerMessage(UUID sessionId, SessionDto.CreateMessageRequest request) {
        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("Sessão não encontrada"));

        // 1. Salvar mensagem do jogador atomicamente no banco antes da chamada de rede
        savePlayerMessage(session, request);

        // 2. Montar histórico para a IA com janela deslizante (últimas 14 mensagens otimizadas pelo banco)
        List<Message> recentHistory = new ArrayList<>(messageRepository.findTop14BySessionIdOrderByCreatedAtDesc(sessionId));
        Collections.reverse(recentHistory);

        List<Map<String, String>> formattedHistory = new ArrayList<>();
        for (Message msg : recentHistory) {
            formattedHistory.add(Map.of(
                    "role", "PLAYER".equalsIgnoreCase(msg.getSender()) ? "PLAYER" : "MODEL",
                    "text", (msg.getSenderName() != null ? msg.getSenderName() + ": " : "") + msg.getContent()
            ));
        }

        // 3. Montar contexto com Bíblia, Regras, Arcos e NPCs
        String systemInstruction = contextBuilderService.buildMasterPrompt(session.getCampaign());

        // 4. Invocar Gemini fora da transação de banco
        String gmNarrative;
        try {
            gmNarrative = geminiService.generateStoryResponse(systemInstruction, formattedHistory);
        } catch (Exception e) {
            log.error("Falha ao invocar Gemini na sessão {}: {}", sessionId, e.getMessage());
            gmNarrative = "O Mestre aguarda sua decisão. O que você faz a seguir?";
        }

        // 5. Salvar resposta do GM atomicamente
        return saveGmMessage(sessionId, gmNarrative);
    }

    @Transactional
    public Message savePlayerMessage(Session session, SessionDto.CreateMessageRequest request) {
        Message playerMsg = Message.builder()
                .session(session)
                .sender("PLAYER")
                .senderName(request.getSenderName() != null ? request.getSenderName() : "Jogador")
                .content(request.getContent())
                .build();
        return messageRepository.save(playerMsg);
    }

    @Transactional
    public SessionDto.MessageResponse saveGmMessage(UUID sessionId, String gmNarrative) {
        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("Sessão não encontrada"));
        Message gmMesg = Message.builder()
                .session(session)
                .sender("GM")
                .senderName("Mestre IA")
                .content(gmNarrative)
                .build();
        Message savedGmMsg = messageRepository.save(gmMesg);
        return toMessageDto(savedGmMsg);
    }

    public SessionDto.MessageResponse regenerateLastGmMessage(UUID sessionId) {
        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("Sessão não encontrada"));

        // Remove última mensagem do GM se existir, de forma transacional
        removeLastGmMessageIfExists(sessionId);

        // Montar histórico restante com janela deslizante (últimas 14 mensagens otimizadas pelo banco)
        List<Message> recentHistory = new ArrayList<>(messageRepository.findTop14BySessionIdOrderByCreatedAtDesc(sessionId));
        if (recentHistory.isEmpty()) {
            throw new IllegalStateException("Nenhuma mensagem na sessão para regenerar");
        }
        Collections.reverse(recentHistory);

        List<Map<String, String>> formattedHistory = new ArrayList<>();
        for (Message msg : recentHistory) {
            formattedHistory.add(Map.of(
                    "role", "PLAYER".equalsIgnoreCase(msg.getSender()) ? "PLAYER" : "MODEL",
                    "text", (msg.getSenderName() != null ? msg.getSenderName() + ": " : "") + msg.getContent()
            ));
        }

        String systemInstruction = contextBuilderService.buildMasterPrompt(session.getCampaign());
        String gmNarrative;
        try {
            gmNarrative = geminiService.generateStoryResponse(systemInstruction, formattedHistory);
        } catch (Exception e) {
            log.error("Falha ao invocar Gemini na regeneração da sessão {}: {}", sessionId, e.getMessage());
            gmNarrative = "O Mestre aguarda sua decisão. O que você faz a seguir?";
        }

        return saveGmMessage(sessionId, gmNarrative);
    }

    @Transactional
    public void removeLastGmMessageIfExists(UUID sessionId) {
        List<Message> history = messageRepository.findBySessionIdOrderByCreatedAtAsc(sessionId);
        if (!history.isEmpty()) {
            Message lastMsg = history.get(history.size() - 1);
            if ("GM".equalsIgnoreCase(lastMsg.getSender())) {
                messageRepository.delete(lastMsg);
            }
        }
    }

    private SessionDto.SessionResponse toSessionDto(Session s) {
        return SessionDto.SessionResponse.builder()
                .id(s.getId())
                .campaignId(s.getCampaign().getId())
                .sessionNumber(s.getSessionNumber())
                .title(s.getTitle())
                .summary(s.getSummary())
                .createdAt(s.getCreatedAt())
                .build();
    }

    private SessionDto.MessageResponse toMessageDto(Message m) {
        return SessionDto.MessageResponse.builder()
                .id(m.getId())
                .sessionId(m.getSession().getId())
                .sender(m.getSender())
                .senderName(m.getSenderName())
                .content(m.getContent())
                .createdAt(m.getCreatedAt())
                .build();
    }
}
