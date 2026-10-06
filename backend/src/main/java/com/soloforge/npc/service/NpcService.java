package com.soloforge.npc.service;

import com.soloforge.campaign.entity.Campaign;
import com.soloforge.campaign.repository.CampaignRepository;
import com.soloforge.npc.dto.NpcDto;
import com.soloforge.npc.entity.Npc;
import com.soloforge.npc.repository.NpcRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class NpcService {

    private final NpcRepository npcRepository;
    private final CampaignRepository campaignRepository;

    @Transactional(readOnly = true)
    public List<NpcDto.Response> getNpcsByCampaign(UUID campaignId) {
        return npcRepository.findByCampaignId(campaignId).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public NpcDto.Response createNpc(UUID campaignId, NpcDto.CreateRequest request) {
        Campaign campaign = campaignRepository.findById(campaignId)
                .orElseThrow(() -> new IllegalArgumentException("Campanha não encontrada: " + campaignId));

        Npc npc = Npc.builder()
                .campaign(campaign)
                .name(request.getName())
                .role(request.getRole() != null ? request.getRole() : "Habitante")
                .description(request.getDescription())
                .personality(request.getPersonality())
                .memory(request.getMemory())
                .isCrystallized(request.getIsCrystallized() != null ? request.getIsCrystallized() : true)
                .build();

        return toDto(npcRepository.save(npc));
    }

    @Transactional
    public NpcDto.Response updateNpc(UUID npcId, NpcDto.UpdateRequest request) {
        Npc npc = npcRepository.findById(npcId)
                .orElseThrow(() -> new IllegalArgumentException("NPC não encontrado: " + npcId));

        if (request.getName() != null && !request.getName().isBlank()) {
            npc.setName(request.getName());
        }
        if (request.getRole() != null) npc.setRole(request.getRole());
        if (request.getDescription() != null) npc.setDescription(request.getDescription());
        if (request.getPersonality() != null) npc.setPersonality(request.getPersonality());
        if (request.getMemory() != null) npc.setMemory(request.getMemory());
        if (request.getIsCrystallized() != null) npc.setIsCrystallized(request.getIsCrystallized());

        return toDto(npcRepository.save(npc));
    }

    @Transactional
    public NpcDto.Response toggleCrystallization(UUID npcId) {
        Npc npc = npcRepository.findById(npcId)
                .orElseThrow(() -> new IllegalArgumentException("NPC não encontrado: " + npcId));

        npc.setIsCrystallized(!Boolean.TRUE.equals(npc.getIsCrystallized()));
        return toDto(npcRepository.save(npc));
    }

    @Transactional
    public void deleteNpc(UUID npcId) {
        npcRepository.deleteById(npcId);
    }

    private NpcDto.Response toDto(Npc entity) {
        return NpcDto.Response.builder()
                .id(entity.getId())
                .campaignId(entity.getCampaign().getId())
                .name(entity.getName())
                .role(entity.getRole())
                .description(entity.getDescription())
                .personality(entity.getPersonality())
                .memory(entity.getMemory())
                .isCrystallized(entity.getIsCrystallized())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}
