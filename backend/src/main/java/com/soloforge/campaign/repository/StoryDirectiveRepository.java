package com.soloforge.campaign.repository;

import com.soloforge.campaign.entity.StoryDirective;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface StoryDirectiveRepository extends JpaRepository<StoryDirective, UUID> {
    List<StoryDirective> findByCampaignIdOrderByCreatedAtDesc(UUID campaignId);
    List<StoryDirective> findByCampaignIdAndIsActiveTrueOrderByCreatedAtDesc(UUID campaignId);
}
