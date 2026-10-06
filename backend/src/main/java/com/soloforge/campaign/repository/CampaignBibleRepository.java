package com.soloforge.campaign.repository;

import com.soloforge.campaign.entity.CampaignBible;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface CampaignBibleRepository extends JpaRepository<CampaignBible, UUID> {
    Optional<CampaignBible> findByCampaignId(UUID campaignId);
}
