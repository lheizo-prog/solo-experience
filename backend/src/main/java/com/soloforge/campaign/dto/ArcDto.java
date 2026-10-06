package com.soloforge.campaign.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

public class ArcDto {

    @Data
    public static class CreateRequest {
        @NotBlank(message = "O título do arco/missão é obrigatório")
        private String title;
        private String goal;
        private String status; // ACTIVE, COMPLETED, FAILED, PAUSED
        private String currentProgress;
    }

    @Data
    public static class UpdateProgressRequest {
        private String status;
        private String currentProgress;
    }

    @Data
    @Builder
    public static class Response {
        private UUID id;
        private UUID campaignId;
        private String title;
        private String goal;
        private String status;
        private String currentProgress;
        private LocalDateTime createdAt;
    }
}
