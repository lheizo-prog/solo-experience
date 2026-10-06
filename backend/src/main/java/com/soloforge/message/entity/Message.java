package com.soloforge.message.entity;

import com.soloforge.session.entity.Session;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "messages")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Message {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false)
    private Session session;

    /**
     * SENDER:
     * - "PLAYER": Mensagem do jogador
     * - "GM": Narração do Mestre IA
     * - "NPC": Fala direta de um personagem
     * - "SYSTEM": Rolagem de dados ou evento de sistema
     */
    @Column(nullable = false, length = 30)
    private String sender;

    @Column(name = "sender_name", length = 100)
    private String senderName;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
