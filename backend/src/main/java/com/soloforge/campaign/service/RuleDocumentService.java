package com.soloforge.campaign.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.soloforge.campaign.dto.CampaignDto;
import com.soloforge.common.util.JsonExtractor;
import com.soloforge.gemini.service.GeminiService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class RuleDocumentService {

    private final GeminiService geminiService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Extrai o texto cru de múltiplos arquivos (TXT, MD, CSV, PDF)
     */
    public String extractTextFromFiles(List<MultipartFile> files) {
        StringBuilder combinedText = new StringBuilder();

        for (MultipartFile file : files) {
            String filename = file.getOriginalFilename() != null ? file.getOriginalFilename().toLowerCase() : "";
            combinedText.append("\n--- DOCUMENTO: ").append(file.getOriginalFilename()).append(" ---\n");

            try {
                if (filename.endsWith(".pdf")) {
                    try (PDDocument document = Loader.loadPDF(file.getBytes())) {
                        PDFTextStripper stripper = new PDFTextStripper();
                        combinedText.append(stripper.getText(document));
                    }
                } else {
                    // Para .txt, .md, .csv e formatos de texto puro
                    combinedText.append(new String(file.getBytes(), StandardCharsets.UTF_8));
                }
            } catch (Exception e) {
                log.error("Erro ao ler arquivo: " + file.getOriginalFilename(), e);
                combinedText.append("[Erro ao ler conteúdo deste arquivo: ").append(e.getMessage()).append("]\n");
            }
        }

        return combinedText.toString();
    }

    /**
     * Usa o Gemini para sintetizar de forma ultracompacta e densa as regras do RPG em formato estruturado
     */
    public CampaignDto.UpdateSystemRequest synthesizeRules(String rawRulesText, String systemName) {
        String systemPrompt = "Você é um Engenheiro de Regras de RPG e Arquiteto de Contexto para LLMs.\n"
                + "Sua tarefa é analisar o manual/documentos brutos fornecidos e sintetizar as regras de jogo em uma estrutura ultradensa e sem ambiguidades.\n"
                + "REQUISITOS CRÍTICOS:\n"
                + "1. NÃO omita nenhuma regra essencial (combate, testes, magia, dano, perícias, falhas críticas, etc.).\n"
                + "2. Remova introduções poéticas, floreios, exemplos repetitivos e ilustrações.\n"
                + "3. Mantenha as fórmulas matemáticas, tabelas essenciais e valores de DT (Dificuldade do Teste).\n"
                + "4. Você DEVE responder ESTRITAMENTE em formato JSON com as 4 chaves exatas abaixo:\n"
                + "{\n"
                + "  \"name\": \"Nome do Sistema\",\n"
                + "  \"coreMechanics\": \"Mecânicas centrais compactas e regras de ação\",\n"
                + "  \"statsAndAttributes\": \"Atributos, perícias, modificadores e cálculos\",\n"
                + "  \"rollInstructions\": \"Como rolar, tipos de dados, tabela de DT e quando exigir teste\"\n"
                + "}\n"
                + "NÃO adicione crases de markdown ```json, responda apenas o objeto JSON puro.";

        String userPrompt = "Sintetize e compacte as seguintes regras brutas para inclusão no banco de dados do SoloForge:\n\n"
                + (systemName != null && !systemName.isBlank() ? "Nome sugerido: " + systemName + "\n\n" : "")
                + rawRulesText;

        String response = geminiService.generateStoryResponse(
                systemPrompt,
                List.of(Map.of("role", "PLAYER", "text", userPrompt))
        );

        CampaignDto.UpdateSystemRequest dto = new CampaignDto.UpdateSystemRequest();
        try {
            String cleanedJson = JsonExtractor.extractJsonObject(response);

            JsonNode node = objectMapper.readTree(cleanedJson);
            dto.setName(node.has("name") ? node.get("name").asText() : (systemName != null ? systemName : "Sistema Sintetizado"));
            dto.setCoreMechanics(node.has("coreMechanics") ? node.get("coreMechanics").asText() : response);
            dto.setStatsAndAttributes(node.has("statsAndAttributes") ? node.get("statsAndAttributes").asText() : "");
            dto.setRollInstructions(node.has("rollInstructions") ? node.get("rollInstructions").asText() : "");
        } catch (Exception e) {
            log.warn("Falha ao parsear JSON do sintetizador de regras. Usando fallback de texto.", e);
            dto.setName(systemName != null && !systemName.isBlank() ? systemName : "Sistema Sintetizado pela IA");
            dto.setCoreMechanics(response);
            dto.setStatsAndAttributes("Conforme descrito nas mecânicas centrais.");
            dto.setRollInstructions("O Mestre deve solicitar [PEDIR_TESTE: dado | DT | atributo | motivo] conforme as regras sintetizadas.");
        }

        return dto;
    }
}
