package com.soloforge.campaign.controller;

import com.soloforge.campaign.dto.ArcDto;
import com.soloforge.campaign.service.StoryArcService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/campaigns/{campaignId}/arcs")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class StoryArcController {

    private final StoryArcService storyArcService;

    @GetMapping
    public ResponseEntity<List<ArcDto.Response>> getArcs(@PathVariable UUID campaignId) {
        return ResponseEntity.ok(storyArcService.getArcsByCampaign(campaignId));
    }

    @PostMapping
    public ResponseEntity<ArcDto.Response> createArc(
            @PathVariable UUID campaignId,
            @Valid @RequestBody ArcDto.CreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(storyArcService.createArc(campaignId, request));
    }

    @PatchMapping("/{arcId}")
    public ResponseEntity<ArcDto.Response> updateArcProgress(
            @PathVariable UUID campaignId,
            @PathVariable UUID arcId,
            @RequestBody ArcDto.UpdateProgressRequest request) {
        return ResponseEntity.ok(storyArcService.updateArcProgress(arcId, request));
    }

    @DeleteMapping("/{arcId}")
    public ResponseEntity<Void> deleteArc(
            @PathVariable UUID campaignId,
            @PathVariable UUID arcId) {
        storyArcService.deleteArc(arcId);
        return ResponseEntity.noContent().build();
    }
}
