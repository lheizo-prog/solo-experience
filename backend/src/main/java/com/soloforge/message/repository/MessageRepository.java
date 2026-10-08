package com.soloforge.message.repository;

import com.soloforge.message.entity.Message;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface MessageRepository extends JpaRepository<Message, UUID> {
    List<Message> findBySessionIdOrderByCreatedAtAsc(UUID sessionId);
    List<Message> findTop14BySessionIdOrderByCreatedAtDesc(UUID sessionId);
    List<Message> findTop30BySessionIdOrderByCreatedAtDesc(UUID sessionId);
}
