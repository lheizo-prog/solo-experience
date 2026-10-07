package com.soloforge.campaign.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

public class StoryDirectiveDto {

    @Data
    public static class CreateRequest {
        @NotBlank(message = "A descrição do fato ou direcionamento é obrigatória")
        private String directive;
        private String type;
    }

    @Data
    public static class UpdateRequest {
        private String directive;
        private String type;
        private Boolean isActive;
    }

    @Data
    @Builder
    public static class Response {
        private UUID id;
        private UUID campaignId;
        private String directive;
        private String type;
        private Boolean isActive;
        private LocalDateTime createdAt;
    }
}
