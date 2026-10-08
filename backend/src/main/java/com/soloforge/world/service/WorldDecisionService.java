package com.soloforge.world.service;

import com.soloforge.campaign.entity.Campaign;
import com.soloforge.campaign.repository.CampaignRepository;
import com.soloforge.world.dto.WorldDecisionDto;
import com.soloforge.world.entity.WorldDecision;
import com.soloforge.world.repository.WorldDecisionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class WorldDecisionService {

    private final WorldDecisionRepository worldDecisionRepository;
    private final CampaignRepository campaignRepository;

    @Transactional(readOnly = true)
    public List<WorldDecisionDto.Response> getDecisionsByCampaign(UUID campaignId) {
        return worldDecisionRepository.findByCampaignIdOrderByCreatedAtDesc(campaignId).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public WorldDecisionDto.Response createDecision(UUID campaignId, WorldDecisionDto.CreateRequest request) {
        Campaign campaign = campaignRepository.findById(campaignId)
                .orElseThrow(() -> new IllegalArgumentException("Campanha não encontrada: " + campaignId));

        WorldDecision decision = WorldDecision.builder()
                .campaign(campaign)
                .title(request.getTitle())
                .decision(request.getDecision())
                .consequence(request.getConsequence() != null ? request.getConsequence() : "As repercussões ainda se espalham pelo mundo...")
                .build();

        return toDto(worldDecisionRepository.save(decision));
    }

    @Transactional
    public WorldDecisionDto.Response updateDecision(UUID campaignId, UUID decisionId, WorldDecisionDto.UpdateRequest request) {
        WorldDecision decision = worldDecisionRepository.findById(decisionId)
                .orElseThrow(() -> new IllegalArgumentException("Decisão não encontrada: " + decisionId));

        if (!decision.getCampaign().getId().equals(campaignId)) {
            throw new IllegalArgumentException("A decisão não pertence à campanha especificada: " + campaignId);
        }

        if (request.getTitle() != null && !request.getTitle().isBlank()) {
            decision.setTitle(request.getTitle());
        }
        if (request.getDecision() != null && !request.getDecision().isBlank()) {
            decision.setDecision(request.getDecision());
        }
        if (request.getConsequence() != null) {
            decision.setConsequence(request.getConsequence());
        }

        return toDto(worldDecisionRepository.save(decision));
    }

    @Transactional
    public void deleteDecision(UUID campaignId, UUID decisionId) {
        WorldDecision decision = worldDecisionRepository.findById(decisionId)
                .orElseThrow(() -> new IllegalArgumentException("Decisão não encontrada: " + decisionId));

        if (!decision.getCampaign().getId().equals(campaignId)) {
            throw new IllegalArgumentException("A decisão não pertence à campanha especificada: " + campaignId);
        }

        worldDecisionRepository.delete(decision);
    }

    private WorldDecisionDto.Response toDto(WorldDecision entity) {
        return WorldDecisionDto.Response.builder()
                .id(entity.getId())
                .campaignId(entity.getCampaign().getId())
                .title(entity.getTitle())
                .decision(entity.getDecision())
                .consequence(entity.getConsequence())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}
