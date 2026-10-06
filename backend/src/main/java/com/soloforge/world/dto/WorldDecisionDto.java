package com.soloforge.world.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

public class WorldDecisionDto {

    @Data
    public static class CreateRequest {
        @NotBlank(message = "O título da decisão é obrigatório")
        private String title;
        
        @NotBlank(message = "A descrição da decisão do jogador é obrigatória")
        private String decision;
        
        private String consequence;
    }

    @Data
    @Builder
    public static class Response {
        private UUID id;
        private UUID campaignId;
        private String title;
        private String decision;
        private String consequence;
        private LocalDateTime createdAt;
    }
}
