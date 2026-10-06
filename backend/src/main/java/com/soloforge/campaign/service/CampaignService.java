package com.soloforge.campaign.service;

import com.soloforge.campaign.dto.CampaignDto;
import com.soloforge.campaign.entity.Campaign;
import com.soloforge.campaign.entity.CampaignBible;
import com.soloforge.campaign.entity.CampaignSystem;
import com.soloforge.campaign.repository.CampaignBibleRepository;
import com.soloforge.campaign.repository.CampaignRepository;
import com.soloforge.campaign.repository.CampaignSystemRepository;
import com.soloforge.session.entity.Session;
import com.soloforge.session.repository.SessionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CampaignService {

    private final CampaignRepository campaignRepository;
    private final CampaignBibleRepository bibleRepository;
    private final CampaignSystemRepository systemRepository;
    private final SessionRepository sessionRepository;

    @Transactional
    public CampaignDto.Response createCampaign(CampaignDto.CreateRequest request) {
        Campaign campaign = Campaign.builder()
                .title(request.getTitle())
                .synopsis(request.getSynopsis())
                .genre(request.getGenre())
                .build();

        CampaignBible bible = CampaignBible.builder()
                .campaign(campaign)
                .worldLore(request.getWorldLore())
                .toneAndStyle(request.getToneAndStyle())
                .playerCharacter(request.getPlayerCharacter())
                .keyThemes(request.getKeyThemes())
                .build();

        CampaignSystem system = CampaignSystem.builder()
                .campaign(campaign)
                .name(request.getSystemName() != null ? request.getSystemName() : "SoloForge Custom Rules")
                .coreMechanics(request.getCoreMechanics())
                .statsAndAttributes(request.getStatsAndAttributes())
                .rollInstructions(request.getRollInstructions())
                .build();

        campaign.setBible(bible);
        campaign.setSystem(system);

        Campaign saved = campaignRepository.save(campaign);

        // Cria a primeira sessão inaugural automaticamente
        Session initialSession = Session.builder()
                .campaign(saved)
                .sessionNumber(1)
                .title("Ato I: O Despertar da Jornada")
                .summary("Início da crônica.")
                .build();
        sessionRepository.save(initialSession);

        return toDto(saved);
    }

    @Transactional(readOnly = true)
    public List<CampaignDto.Response> listAllCampaigns() {
        return campaignRepository.findAll().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public CampaignDto.Response getCampaignById(UUID id) {
        Campaign campaign = campaignRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Campanha não encontrada com id: " + id));
        return toDto(campaign);
    }

    @Transactional
    public CampaignDto.Response updateBible(UUID campaignId, CampaignDto.UpdateBibleRequest request) {
        Campaign campaign = campaignRepository.findById(campaignId)
                .orElseThrow(() -> new IllegalArgumentException("Campanha não encontrada: " + campaignId));

        CampaignBible bible = campaign.getBible();
        if (bible == null) {
            bible = CampaignBible.builder().campaign(campaign).build();
        }

        bible.setWorldLore(request.getWorldLore());
        bible.setToneAndStyle(request.getToneAndStyle());
        bible.setPlayerCharacter(request.getPlayerCharacter());
        bible.setKeyThemes(request.getKeyThemes());

        bibleRepository.save(bible);
        campaign.setBible(bible);

        return toDto(campaign);
    }

    @Transactional
    public CampaignDto.Response updateSystem(UUID campaignId, CampaignDto.UpdateSystemRequest request) {
        Campaign campaign = campaignRepository.findById(campaignId)
                .orElseThrow(() -> new IllegalArgumentException("Campanha não encontrada: " + campaignId));

        CampaignSystem system = campaign.getSystem();
        if (system == null) {
            system = CampaignSystem.builder().campaign(campaign).build();
        }

        if (request.getName() != null) system.setName(request.getName());
        system.setCoreMechanics(request.getCoreMechanics());
        system.setStatsAndAttributes(request.getStatsAndAttributes());
        system.setRollInstructions(request.getRollInstructions());

        systemRepository.save(system);
        campaign.setSystem(system);

        return toDto(campaign);
    }

    public CampaignDto.Response toDto(Campaign entity) {
        CampaignDto.BibleResponse bibleDto = null;
        if (entity.getBible() != null) {
            bibleDto = CampaignDto.BibleResponse.builder()
                    .id(entity.getBible().getId())
                    .worldLore(entity.getBible().getWorldLore())
                    .toneAndStyle(entity.getBible().getToneAndStyle())
                    .playerCharacter(entity.getBible().getPlayerCharacter())
                    .keyThemes(entity.getBible().getKeyThemes())
                    .build();
        }

        CampaignDto.SystemResponse systemDto = null;
        if (entity.getSystem() != null) {
            systemDto = CampaignDto.SystemResponse.builder()
                    .id(entity.getSystem().getId())
                    .name(entity.getSystem().getName())
                    .coreMechanics(entity.getSystem().getCoreMechanics())
                    .statsAndAttributes(entity.getSystem().getStatsAndAttributes())
                    .rollInstructions(entity.getSystem().getRollInstructions())
                    .build();
        }

        return CampaignDto.Response.builder()
                .id(entity.getId())
                .title(entity.getTitle())
                .synopsis(entity.getSynopsis())
                .genre(entity.getGenre())
                .bible(bibleDto)
                .system(systemDto)
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
