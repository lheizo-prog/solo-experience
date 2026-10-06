package com.soloforge.campaign.repository;

import com.soloforge.campaign.entity.CampaignSystem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface CampaignSystemRepository extends JpaRepository<CampaignSystem, UUID> {
    Optional<CampaignSystem> findByCampaignId(UUID campaignId);
}
