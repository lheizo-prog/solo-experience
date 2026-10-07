package com.soloforge.npc.controller;

import com.soloforge.npc.dto.NpcDto;
import com.soloforge.npc.service.NpcService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/campaigns/{campaignId}/npcs")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class NpcController {

    private final NpcService npcService;

    @GetMapping
    public ResponseEntity<List<NpcDto.Response>> getNpcs(@PathVariable UUID campaignId) {
        return ResponseEntity.ok(npcService.getNpcsByCampaign(campaignId));
    }

    @PostMapping
    public ResponseEntity<NpcDto.Response> createNpc(
            @PathVariable UUID campaignId,
            @Valid @RequestBody NpcDto.CreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(npcService.createNpc(campaignId, request));
    }

    @PostMapping("/generate-with-ai")
    public ResponseEntity<NpcDto.Response> generateNpcWithAi(
            @PathVariable UUID campaignId,
            @RequestBody NpcDto.GenerateAiRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(npcService.generateNpcWithAi(campaignId, request));
    }

    @PutMapping("/{npcId}")
    public ResponseEntity<NpcDto.Response> updateNpc(
            @PathVariable UUID campaignId,
            @PathVariable UUID npcId,
            @RequestBody NpcDto.UpdateRequest request) {
        return ResponseEntity.ok(npcService.updateNpc(npcId, request));
    }

    @PostMapping("/{npcId}/evolve")
    public ResponseEntity<NpcDto.Response> evolveNpc(
            @PathVariable UUID campaignId,
            @PathVariable UUID npcId,
            @Valid @RequestBody NpcDto.EvolveRequest request) {
        return ResponseEntity.ok(npcService.evolveNpcWithAi(campaignId, npcId, request));
    }

    @PatchMapping("/{npcId}/crystallize")
    public ResponseEntity<NpcDto.Response> toggleCrystallize(
            @PathVariable UUID campaignId,
            @PathVariable UUID npcId) {
        return ResponseEntity.ok(npcService.toggleCrystallization(npcId));
    }

    @DeleteMapping("/{npcId}")
    public ResponseEntity<Void> deleteNpc(
            @PathVariable UUID campaignId,
            @PathVariable UUID npcId) {
        npcService.deleteNpc(npcId);
        return ResponseEntity.noContent().build();
    }
}
