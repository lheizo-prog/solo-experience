package com.soloforge.npc.repository;

import com.soloforge.npc.entity.Npc;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface NpcRepository extends JpaRepository<Npc, UUID> {
    List<Npc> findByCampaignId(UUID campaignId);
    List<Npc> findByCampaignIdAndIsCrystallizedTrue(UUID campaignId);
}
