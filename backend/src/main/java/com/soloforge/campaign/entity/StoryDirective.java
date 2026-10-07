package com.soloforge.campaign.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "story_directives")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StoryDirective {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "campaign_id", nullable = false)
    private Campaign campaign;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String directive;

    /**
     * TIPO DE DIRETRIZ:
     * - "PLOT_TWIST": Reviravolta de enredo
     * - "NARRATIVE_DIRECTION": Rumo ou objetivo imediato da cena
     * - "ESTABLISHED_FACT": Fato inquestionável estabelecido no mundo
     * - "TONE_SUGGESTION": Mudança de clima ou tom da cena
     */
    @Column(length = 50, nullable = false)
    @Builder.Default
    private String type = "NARRATIVE_DIRECTION";

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
