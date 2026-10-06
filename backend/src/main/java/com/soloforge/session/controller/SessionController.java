package com.soloforge.session.controller;

import com.soloforge.session.dto.SessionDto;
import com.soloforge.session.service.GameSessionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/sessions")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class SessionController {

    private final GameSessionService sessionService;

    @GetMapping("/campaign/{campaignId}")
    public ResponseEntity<List<SessionDto.SessionResponse>> getCampaignSessions(@PathVariable UUID campaignId) {
        return ResponseEntity.ok(sessionService.getSessionsByCampaign(campaignId));
    }

    @PostMapping("/campaign/{campaignId}")
    public ResponseEntity<SessionDto.SessionResponse> createNextSession(
            @PathVariable UUID campaignId,
            @RequestParam(required = false) String title) {
        return ResponseEntity.ok(sessionService.createNextSession(campaignId, title));
    }

    @GetMapping("/{sessionId}/messages")
    public ResponseEntity<List<SessionDto.MessageResponse>> getSessionMessages(@PathVariable UUID sessionId) {
        return ResponseEntity.ok(sessionService.getMessagesBySession(sessionId));
    }

    @PostMapping("/{sessionId}/messages")
    public ResponseEntity<SessionDto.MessageResponse> sendMessage(
            @PathVariable UUID sessionId,
            @Valid @RequestBody SessionDto.CreateMessageRequest request) {
        return ResponseEntity.ok(sessionService.sendPlayerMessage(sessionId, request));
    }

    @PostMapping("/{sessionId}/conclude")
    public ResponseEntity<SessionDto.SessionResponse> concludeSession(@PathVariable UUID sessionId) {
        return ResponseEntity.ok(sessionService.concludeSession(sessionId));
    }
}

