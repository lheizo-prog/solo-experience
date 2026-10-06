package com.soloforge.campaign.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "campaign_systems")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CampaignSystem {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "campaign_id", nullable = false, unique = true)
    private Campaign campaign;

    @Column(nullable = false, length = 100)
    @Builder.Default
    private String name = "Custom Ruleset";

    @Column(columnDefinition = "TEXT")
    private String coreMechanics;

    @Column(columnDefinition = "TEXT")
    private String statsAndAttributes;

    @Column(columnDefinition = "TEXT")
    private String rollInstructions;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
