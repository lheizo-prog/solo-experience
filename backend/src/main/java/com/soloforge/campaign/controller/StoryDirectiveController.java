package com.soloforge.campaign.controller;

import com.soloforge.campaign.dto.StoryDirectiveDto;
import com.soloforge.campaign.service.StoryDirectiveService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/campaigns/{campaignId}/directives")
@RequiredArgsConstructor
public class StoryDirectiveController {

    private final StoryDirectiveService directiveService;

    @GetMapping
    public ResponseEntity<List<StoryDirectiveDto.Response>> getDirectives(@PathVariable UUID campaignId) {
        return ResponseEntity.ok(directiveService.getDirectivesByCampaign(campaignId));
    }

    @PostMapping
    public ResponseEntity<StoryDirectiveDto.Response> createDirective(
            @PathVariable UUID campaignId,
            @Valid @RequestBody StoryDirectiveDto.CreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(directiveService.createDirective(campaignId, request));
    }

    @PatchMapping("/{directiveId}/toggle")
    public ResponseEntity<StoryDirectiveDto.Response> toggleActive(
            @PathVariable UUID campaignId,
            @PathVariable UUID directiveId) {
        return ResponseEntity.ok(directiveService.toggleActive(campaignId, directiveId));
    }

    @PutMapping("/{directiveId}")
    public ResponseEntity<StoryDirectiveDto.Response> updateDirective(
            @PathVariable UUID campaignId,
            @PathVariable UUID directiveId,
            @RequestBody StoryDirectiveDto.UpdateRequest request) {
        return ResponseEntity.ok(directiveService.updateDirective(campaignId, directiveId, request));
    }

    @DeleteMapping("/{directiveId}")
    public ResponseEntity<Void> deleteDirective(
            @PathVariable UUID campaignId,
            @PathVariable UUID directiveId) {
        directiveService.deleteDirective(campaignId, directiveId);
        return ResponseEntity.noContent().build();
    }
}
