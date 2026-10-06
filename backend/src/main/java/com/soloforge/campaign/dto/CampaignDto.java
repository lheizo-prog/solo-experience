package com.soloforge.campaign.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

public class CampaignDto {

    @Data
    public static class CreateRequest {
        @NotBlank(message = "O título da campanha é obrigatório")
        private String title;
        private String synopsis;
        private String genre;

        // Bíblia inicial
        private String worldLore;
        private String toneAndStyle;
        private String playerCharacter;
        private String keyThemes;

        // Sistema inicial
        private String systemName;
        private String coreMechanics;
        private String statsAndAttributes;
        private String rollInstructions;
    }

    @Data
    public static class UpdateBibleRequest {
        private String worldLore;
        private String toneAndStyle;
        private String playerCharacter;
        private String keyThemes;
    }

    @Data
    public static class UpdateSystemRequest {
        private String name;
        private String coreMechanics;
        private String statsAndAttributes;
        private String rollInstructions;
    }

    @Data
    @Builder
    public static class Response {
        private UUID id;
        private String title;
        private String synopsis;
        private String genre;
        private BibleResponse bible;
        private SystemResponse system;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
    }

    @Data
    @Builder
    public static class BibleResponse {
        private UUID id;
        private String worldLore;
        private String toneAndStyle;
        private String playerCharacter;
        private String keyThemes;
    }

    @Data
    @Builder
    public static class SystemResponse {
        private UUID id;
        private String name;
        private String coreMechanics;
        private String statsAndAttributes;
        private String rollInstructions;
    }
}
