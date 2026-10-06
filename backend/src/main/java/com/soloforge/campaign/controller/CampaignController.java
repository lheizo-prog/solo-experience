package com.soloforge.campaign.controller;

import com.soloforge.campaign.dto.CampaignDto;
import com.soloforge.campaign.service.CampaignService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;


import com.soloforge.campaign.service.RuleDocumentService;
import org.springframework.http.MediaType;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/campaigns")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class CampaignController {

    private final CampaignService campaignService;
    private final RuleDocumentService ruleDocumentService;

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

    /**
     * Sintetiza regras a partir de múltiplos arquivos enviados (.pdf, .txt, .md, .csv)
     * e atualiza o sistema de regras da campanha diretamente no banco
     */
    @PostMapping(value = "/{id}/upload-rules", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<CampaignDto.Response> uploadAndSynthesizeRules(
            @PathVariable UUID id,
            @RequestParam("files") List<MultipartFile> files,
            @RequestParam(value = "systemName", required = false) String systemName) {
        
        String extractedText = ruleDocumentService.extractTextFromFiles(files);
        CampaignDto.UpdateSystemRequest synthesized = ruleDocumentService.synthesizeRules(extractedText, systemName);
        return ResponseEntity.ok(campaignService.updateSystem(id, synthesized));
    }

    /**
     * Sintetiza regras a partir de texto bruto longo e atualiza no banco
     */
    @PostMapping("/{id}/synthesize-rules")
    public ResponseEntity<CampaignDto.Response> synthesizeFromRawText(
            @PathVariable UUID id,
            @RequestBody Map<String, String> payload) {
        
        String rawText = payload.getOrDefault("rawText", "");
        String systemName = payload.getOrDefault("systemName", "Sistema Sintetizado");
        
        CampaignDto.UpdateSystemRequest synthesized = ruleDocumentService.synthesizeRules(rawText, systemName);
        return ResponseEntity.ok(campaignService.updateSystem(id, synthesized));
    }
}

