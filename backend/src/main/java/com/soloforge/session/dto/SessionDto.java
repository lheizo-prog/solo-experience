package com.soloforge.session.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

public class SessionDto {

    @Data
    public static class CreateMessageRequest {
        @NotBlank(message = "O conteúdo da mensagem não pode ser vazio")
        private String content;

        private String senderName; // Se nulo, assume "Jogador"
    }

    @Data
    @Builder
    public static class MessageResponse {
        private UUID id;
        private UUID sessionId;
        private String sender;
        private String senderName;
        private String content;
        private LocalDateTime createdAt;
    }

    @Data
    @Builder
    public static class SessionResponse {
        private UUID id;
        private UUID campaignId;
        private Integer sessionNumber;
        private String title;
        private String summary;
        private LocalDateTime createdAt;
    }
}
