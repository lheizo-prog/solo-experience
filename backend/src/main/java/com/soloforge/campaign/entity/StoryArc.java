package com.soloforge.campaign.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "story_arcs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StoryArc {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "campaign_id", nullable = false)
    private Campaign campaign;

    @Column(nullable = false, length = 150)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String goal;

    @Column(length = 30)
    @Builder.Default
    private String status = "ACTIVE"; // ACTIVE, COMPLETED, FAILED, PAUSED

    @Column(columnDefinition = "TEXT")
    private String currentProgress;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
