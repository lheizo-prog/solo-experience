package com.soloforge.npc.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

public class NpcDto {

    @Data
    public static class CreateRequest {
        @NotBlank(message = "O nome do NPC é obrigatório")
        private String name;
        private String role;
        private String description;
        private String personality;
        private String memory;
        private String imageUrl;
        private String attributes;
        private Boolean isCrystallized;
    }

    @Data
    public static class GenerateAiRequest {
        private String concept; // ex: "Lorde vampiro que governa a fortaleza nas sombras"
        private String type;    // "BOSS", "MINION", "ALLY", "RIVAL", "MERCHANT"
        private String challengeLevel; // "EASY", "MEDIUM", "HARD", "DEADLY", "LEGENDARY"
        private String imageUrl;
    }

    @Data
    public static class UpdateRequest {
        private String name;
        private String role;
        private String description;
        private String personality;
        private String memory;
        private String imageUrl;
        private String attributes;
        private Boolean isCrystallized;
    }

    @Data
    public static class EvolveRequest {
        @NotBlank(message = "A descrição do evento ou evolução é obrigatória")
        private String eventDescription;
    }

    @Data
    @Builder
    public static class Response {
        private UUID id;
        private UUID campaignId;
        private String name;
        private String role;
        private String description;
        private String personality;
        private String memory;
        private String imageUrl;
        private String attributes;
        private Boolean isCrystallized;
        private LocalDateTime createdAt;
    }
}
