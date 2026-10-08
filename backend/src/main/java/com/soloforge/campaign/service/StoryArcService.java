package com.soloforge.campaign.service;

import com.soloforge.campaign.dto.ArcDto;
import com.soloforge.campaign.entity.Campaign;
import com.soloforge.campaign.entity.StoryArc;
import com.soloforge.campaign.repository.CampaignRepository;
import com.soloforge.campaign.repository.StoryArcRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class StoryArcService {

    private final StoryArcRepository storyArcRepository;
    private final CampaignRepository campaignRepository;

    @Transactional(readOnly = true)
    public List<ArcDto.Response> getArcsByCampaign(UUID campaignId) {
        return storyArcRepository.findByCampaignIdOrderByCreatedAtDesc(campaignId).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public ArcDto.Response createArc(UUID campaignId, ArcDto.CreateRequest request) {
        Campaign campaign = campaignRepository.findById(campaignId)
                .orElseThrow(() -> new IllegalArgumentException("Campanha não encontrada: " + campaignId));

        StoryArc arc = StoryArc.builder()
                .campaign(campaign)
                .title(request.getTitle())
                .goal(request.getGoal())
                .status(request.getStatus() != null && !request.getStatus().isBlank() ? request.getStatus().toUpperCase() : "ACTIVE")
                .currentProgress(request.getCurrentProgress() != null ? request.getCurrentProgress() : "Iniciada recentemente.")
                .build();

        return toDto(storyArcRepository.save(arc));
    }

    @Transactional
    public ArcDto.Response updateArcProgress(UUID campaignId, UUID arcId, ArcDto.UpdateProgressRequest request) {
        StoryArc arc = storyArcRepository.findById(arcId)
                .orElseThrow(() -> new IllegalArgumentException("Arco narrativo não encontrado: " + arcId));

        if (!arc.getCampaign().getId().equals(campaignId)) {
            throw new IllegalArgumentException("O arco narrativo não pertence à campanha especificada: " + campaignId);
        }

        if (request.getStatus() != null && !request.getStatus().isBlank()) {
            arc.setStatus(request.getStatus().toUpperCase());
        }
        if (request.getCurrentProgress() != null) {
            arc.setCurrentProgress(request.getCurrentProgress());
        }

        return toDto(storyArcRepository.save(arc));
    }

    @Transactional
    public void deleteArc(UUID campaignId, UUID arcId) {
        StoryArc arc = storyArcRepository.findById(arcId)
                .orElseThrow(() -> new IllegalArgumentException("Arco narrativo não encontrado: " + arcId));

        if (!arc.getCampaign().getId().equals(campaignId)) {
            throw new IllegalArgumentException("O arco narrativo não pertence à campanha especificada: " + campaignId);
        }

        storyArcRepository.delete(arc);
    }

    private ArcDto.Response toDto(StoryArc entity) {
        return ArcDto.Response.builder()
                .id(entity.getId())
                .campaignId(entity.getCampaign().getId())
                .title(entity.getTitle())
                .goal(entity.getGoal())
                .status(entity.getStatus())
                .currentProgress(entity.getCurrentProgress())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}
