package com.soloforge.campaign.controller;

import com.soloforge.campaign.dto.CampaignDto;
import com.soloforge.campaign.service.CampaignService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/campaigns")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class CampaignController {

    private final CampaignService campaignService;

    @PostMapping
    public ResponseEntity<CampaignDto.Response> createCampaign(@Valid @RequestBody CampaignDto.CreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(campaignService.createCampaign(request));
    }

    @GetMapping
    public ResponseEntity<List<CampaignDto.Response>> listCampaigns() {
        return ResponseEntity.ok(campaignService.listAllCampaigns());
    }

    @GetMapping("/{id}")
    public ResponseEntity<CampaignDto.Response> getCampaign(@PathVariable UUID id) {
        return ResponseEntity.ok(campaignService.getCampaignById(id));
    }

    @PutMapping("/{id}/bible")
    public ResponseEntity<CampaignDto.Response> updateBible(@PathVariable UUID id, @RequestBody CampaignDto.UpdateBibleRequest request) {
        return ResponseEntity.ok(campaignService.updateBible(id, request));
    }

    @PutMapping("/{id}/system")
    public ResponseEntity<CampaignDto.Response> updateSystem(@PathVariable UUID id, @RequestBody CampaignDto.UpdateSystemRequest request) {
        return ResponseEntity.ok(campaignService.updateSystem(id, request));
    }
}
