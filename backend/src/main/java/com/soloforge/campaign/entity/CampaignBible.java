package com.soloforge.campaign.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "campaign_bibles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CampaignBible {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "campaign_id", nullable = false, unique = true)
    private Campaign campaign;

    @Column(columnDefinition = "TEXT")
    private String worldLore;

    @Column(columnDefinition = "TEXT")
    private String toneAndStyle;

    @Column(columnDefinition = "TEXT")
    private String playerCharacter;

    @Column(columnDefinition = "TEXT")
    private String keyThemes;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
