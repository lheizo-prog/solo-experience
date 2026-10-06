package com.soloforge.world.repository;

import com.soloforge.world.entity.WorldDecision;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface WorldDecisionRepository extends JpaRepository<WorldDecision, UUID> {
    List<WorldDecision> findByCampaignIdOrderByCreatedAtDesc(UUID campaignId);
}
