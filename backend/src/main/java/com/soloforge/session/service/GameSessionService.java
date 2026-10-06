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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
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

    @Transactional
    public SessionDto.SessionResponse concludeSession(UUID sessionId) {
        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("Sessão não encontrada: " + sessionId));

        List<Message> messages = messageRepository.findBySessionIdOrderByCreatedAtAsc(sessionId);
        
        // Solicita ao Gemini para gerar um resumo crônico conciso
        String summary = "Sessão concluída.";
        if (!messages.isEmpty()) {
            StringBuilder conversationText = new StringBuilder();
            for (Message m : messages) {
                conversationText.append(m.getSenderName() != null ? m.getSenderName() : m.getSender())
                        .append(": ")
                        .append(m.getContent())
                        .append("\n");
            }

            String summaryPrompt = "Você é o Cronista Real do SoloForge. Resuma os acontecimentos mais marcantes, batalhas, decisões e descobertas da conversa a seguir em 3 a 4 tópicos épicos e concisos. Este resumo servirá de memória histórica para os próximos atos da crônica.\n\n"
                    + "=== DIÁLOGO DA SESSÃO ===\n" + conversationText;

            summary = geminiService.generateStoryResponse(
                    "Você é um cronista e historiador épico. Gere apenas o resumo em tópicos objetivos.",
                    List.of(Map.of("role", "PLAYER", "text", summaryPrompt))
            );
        }

        session.setSummary(summary);
        Session saved = sessionRepository.save(session);

        // Cria automaticamente o próximo Ato
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


    @Transactional
    public SessionDto.MessageResponse sendPlayerMessage(UUID sessionId, SessionDto.CreateMessageRequest request) {
        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("Sessão não encontrada"));

        // 1. Salvar mensagem do jogador
        Message playerMsg = Message.builder()
                .session(session)
                .sender("PLAYER")
                .senderName(request.getSenderName() != null ? request.getSenderName() : "Jogador")
                .content(request.getContent())
                .build();
        messageRepository.save(playerMsg);

        // 2. Montar histórico para a IA
        List<Message> history = messageRepository.findBySessionIdOrderByCreatedAtAsc(sessionId);
        List<Map<String, String>> formattedHistory = new ArrayList<>();
        for (Message msg : history) {
            formattedHistory.add(Map.of(
                    "role", "PLAYER".equalsIgnoreCase(msg.getSender()) ? "PLAYER" : "MODEL",
                    "text", (msg.getSenderName() != null ? msg.getSenderName() + ": " : "") + msg.getContent()
            ));
        }

        // 3. Montar contexto com Bíblia, Regras, Arcos e NPCs
        String systemInstruction = contextBuilderService.buildMasterPrompt(session.getCampaign());

        // 4. Invocar Gemini
        String gmNarrative = geminiService.generateStoryResponse(systemInstruction, formattedHistory);

        // 5. Salvar resposta do GM
        Message gmMesg = Message.builder()
                .session(session)
                .sender("GM")
                .senderName("Mestre IA")
                .content(gmNarrative)
                .build();
        Message savedGmMsg = messageRepository.save(gmMesg);

        return toMessageDto(savedGmMsg);
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
