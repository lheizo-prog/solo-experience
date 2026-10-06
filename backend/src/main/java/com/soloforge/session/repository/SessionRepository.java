package com.soloforge.session.repository;

import com.soloforge.session.entity.Session;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SessionRepository extends JpaRepository<Session, UUID> {
    List<Session> findByCampaignIdOrderBySessionNumberAsc(UUID campaignId);
    Optional<Session> findFirstByCampaignIdOrderBySessionNumberDesc(UUID campaignId);
}
