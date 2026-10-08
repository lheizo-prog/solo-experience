package com.soloforge.world.controller;

import com.soloforge.world.dto.WorldDecisionDto;
import com.soloforge.world.service.WorldDecisionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/campaigns/{campaignId}/decisions")
@RequiredArgsConstructor
public class WorldDecisionController {

    private final WorldDecisionService worldDecisionService;

    @GetMapping
    public ResponseEntity<List<WorldDecisionDto.Response>> getDecisions(@PathVariable UUID campaignId) {
        return ResponseEntity.ok(worldDecisionService.getDecisionsByCampaign(campaignId));
    }

    @PostMapping
    public ResponseEntity<WorldDecisionDto.Response> createDecision(
            @PathVariable UUID campaignId,
            @Valid @RequestBody WorldDecisionDto.CreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(worldDecisionService.createDecision(campaignId, request));
    }

    @PatchMapping("/{decisionId}")
    public ResponseEntity<WorldDecisionDto.Response> updateDecision(
            @PathVariable UUID campaignId,
            @PathVariable UUID decisionId,
            @RequestBody WorldDecisionDto.UpdateRequest request) {
        return ResponseEntity.ok(worldDecisionService.updateDecision(campaignId, decisionId, request));
    }

    @DeleteMapping("/{decisionId}")
    public ResponseEntity<Void> deleteDecision(
            @PathVariable UUID campaignId,
            @PathVariable UUID decisionId) {
        worldDecisionService.deleteDecision(campaignId, decisionId);
        return ResponseEntity.noContent().build();
    }
}
