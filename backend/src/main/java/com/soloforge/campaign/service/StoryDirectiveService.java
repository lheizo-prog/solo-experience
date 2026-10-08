package com.soloforge.campaign.service;

import com.soloforge.campaign.dto.StoryDirectiveDto;
import com.soloforge.campaign.entity.Campaign;
import com.soloforge.campaign.entity.StoryDirective;
import com.soloforge.campaign.repository.CampaignRepository;
import com.soloforge.campaign.repository.StoryDirectiveRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class StoryDirectiveService {

    private final StoryDirectiveRepository directiveRepository;
    private final CampaignRepository campaignRepository;

    @Transactional(readOnly = true)
    public List<StoryDirectiveDto.Response> getDirectivesByCampaign(UUID campaignId) {
        return directiveRepository.findByCampaignIdOrderByCreatedAtDesc(campaignId).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public StoryDirectiveDto.Response createDirective(UUID campaignId, StoryDirectiveDto.CreateRequest request) {
        Campaign campaign = campaignRepository.findById(campaignId)
                .orElseThrow(() -> new IllegalArgumentException("Campanha não encontrada: " + campaignId));

        StoryDirective directive = StoryDirective.builder()
                .campaign(campaign)
                .directive(request.getDirective())
                .type(request.getType() != null && !request.getType().isBlank() ? request.getType() : "NARRATIVE_DIRECTION")
                .isActive(true)
                .build();

        return toDto(directiveRepository.save(directive));
    }

    @Transactional
    public StoryDirectiveDto.Response toggleActive(UUID campaignId, UUID directiveId) {
        StoryDirective directive = directiveRepository.findById(directiveId)
                .orElseThrow(() -> new IllegalArgumentException("Diretriz não encontrada: " + directiveId));

        if (!directive.getCampaign().getId().equals(campaignId)) {
            throw new IllegalArgumentException("A diretriz não pertence à campanha especificada: " + campaignId);
        }

        directive.setIsActive(!Boolean.TRUE.equals(directive.getIsActive()));
        return toDto(directiveRepository.save(directive));
    }

    @Transactional
    public StoryDirectiveDto.Response updateDirective(UUID campaignId, UUID directiveId, StoryDirectiveDto.UpdateRequest request) {
        StoryDirective directive = directiveRepository.findById(directiveId)
                .orElseThrow(() -> new IllegalArgumentException("Diretriz não encontrada: " + directiveId));

        if (!directive.getCampaign().getId().equals(campaignId)) {
            throw new IllegalArgumentException("A diretriz não pertence à campanha especificada: " + campaignId);
        }

        if (request.getDirective() != null && !request.getDirective().isBlank()) {
            directive.setDirective(request.getDirective());
        }
        if (request.getType() != null && !request.getType().isBlank()) {
            directive.setType(request.getType());
        }
        if (request.getIsActive() != null) {
            directive.setIsActive(request.getIsActive());
        }

        return toDto(directiveRepository.save(directive));
    }

    @Transactional
    public void deleteDirective(UUID campaignId, UUID directiveId) {
        StoryDirective directive = directiveRepository.findById(directiveId)
                .orElseThrow(() -> new IllegalArgumentException("Diretriz não encontrada: " + directiveId));

        if (!directive.getCampaign().getId().equals(campaignId)) {
            throw new IllegalArgumentException("A diretriz não pertence à campanha especificada: " + campaignId);
        }

        directiveRepository.delete(directive);
    }

    private StoryDirectiveDto.Response toDto(StoryDirective entity) {
        return StoryDirectiveDto.Response.builder()
                .id(entity.getId())
                .campaignId(entity.getCampaign().getId())
                .directive(entity.getDirective())
                .type(entity.getType())
                .isActive(entity.getIsActive())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}
