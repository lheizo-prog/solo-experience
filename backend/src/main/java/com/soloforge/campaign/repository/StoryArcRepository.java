package com.soloforge.campaign.repository;

import com.soloforge.campaign.entity.StoryArc;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface StoryArcRepository extends JpaRepository<StoryArc, UUID> {
    List<StoryArc> findByCampaignIdOrderByCreatedAtDesc(UUID campaignId);
    List<StoryArc> findByCampaignIdAndStatus(UUID campaignId, String status);
}
