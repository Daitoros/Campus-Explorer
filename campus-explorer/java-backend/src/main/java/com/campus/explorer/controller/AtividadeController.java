package com.campus.explorer.controller;

import com.campus.explorer.model.Atividade;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/atividades")
@CrossOrigin(origins = "*")
public class AtividadeController {

    @Value("${google.script.url}")
    private String scriptUrl;

    private final RestTemplate restTemplate = new RestTemplate();

    @GetMapping
    public ResponseEntity<?> getAtividades() {
        if (scriptUrl == null || scriptUrl.isEmpty() || scriptUrl.contains("...")) {
            return ResponseEntity.ok("[]"); // Retorna vazio se não configurado
        }
        
        try {
            String response = restTemplate.getForObject(scriptUrl, String.class);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Erro ao buscar dados do Google Sheets: " + e.getMessage());
        }
    }

    @PostMapping
    public ResponseEntity<?> saveAtividade(@RequestBody Atividade atividade) {
        if (scriptUrl == null || scriptUrl.isEmpty() || scriptUrl.contains("...")) {
            return ResponseEntity.badRequest().body("URL do Google Script não configurada");
        }

        Map<String, Object> payload = new HashMap<>();
        payload.put("id", atividade.getId());
        payload.put("nome", atividade.getNome());
        payload.put("descricao", atividade.getDescricao());
        payload.put("categoria", atividade.getCategoria());
        payload.put("local", atividade.getLocal());
        payload.put("latitude", atividade.getLatitude());
        payload.put("longitude", atividade.getLongitude());
        payload.put("tipo", atividade.getTipo());
        payload.put("instagram", atividade.getInstagram());
        payload.put("website", atividade.getWebsite());
        payload.put("localPaiId", atividade.getLocalPaiId());
        
        // Determina se é adição ou edição
        // Nota: No Java simplificado, deixamos o Apps Script lidar com a lógica baseada no ID
        payload.put("action", atividade.getId() != null ? "edit" : "add");

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(payload, headers);
            
            String response = restTemplate.postForObject(scriptUrl, entity, String.class);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Erro ao salvar no Google Sheets: " + e.getMessage());
        }
    }

    @PostMapping("/delete")
    public ResponseEntity<?> deleteAtividade(@RequestBody Map<String, String> body) {
        if (scriptUrl == null || scriptUrl.isEmpty() || scriptUrl.contains("...")) {
            return ResponseEntity.badRequest().body("URL do Google Script não configurada");
        }

        Map<String, Object> payload = new HashMap<>();
        payload.put("id", body.get("id"));
        payload.put("action", "delete");

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(payload, headers);
            
            String response = restTemplate.postForObject(scriptUrl, entity, String.class);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Erro ao deletar no Google Sheets: " + e.getMessage());
        }
    }
}
