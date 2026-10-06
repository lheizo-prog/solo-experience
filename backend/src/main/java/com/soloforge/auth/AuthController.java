package com.soloforge.auth;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    @Value("${app.auth.master-user:}")
    private String masterUser;

    @Value("${app.auth.master-pass:}")
    private String masterPass;

    public record LoginRequest(String username, String password) {}
    public record LoginResponse(boolean success, String token, String message) {}

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@RequestBody LoginRequest req) {
        // Se as variáveis de ambiente não foram definidas no backend, libera ou avisa
        if (masterUser == null || masterUser.isBlank() || masterPass == null || masterPass.isBlank()) {
            // Se não configurado, gera token temporário padrão
            return ResponseEntity.ok(new LoginResponse(true, "dev-bypass-token", "Login liberado (credenciais mestre não configuradas no backend)."));
        }

        if (masterUser.equals(req.username()) && masterPass.equals(req.password())) {
            // Gera um token assinado simples com hash
            String rawToken = req.username() + ":" + req.password() + ":soloforge";
            try {
                MessageDigest digest = MessageDigest.getInstance("SHA-256");
                byte[] hash = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
                String token = Base64.getUrlEncoder().withoutPadding().encodeToString(hash);
                return ResponseEntity.ok(new LoginResponse(true, token, "Acesso autorizado com sucesso."));
            } catch (Exception e) {
                return ResponseEntity.ok(new LoginResponse(true, "authorized-token", "Acesso autorizado."));
            }
        }

        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(new LoginResponse(false, null, "Credenciais inválidas. Acesso restrito ao mestre da forja."));
    }

    @GetMapping("/verify")
    public ResponseEntity<Map<String, Object>> verify(@RequestHeader(value = "X-Master-Token", required = false) String token) {
        if (masterUser == null || masterUser.isBlank() || masterPass == null || masterPass.isBlank()) {
            return ResponseEntity.ok(Map.of("authenticated", true, "user", "Dev Admin"));
        }

        if (token == null || token.isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("authenticated", false));
        }

        try {
            String rawToken = masterUser + ":" + masterPass + ":soloforge";
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
            String expectedToken = Base64.getUrlEncoder().withoutPadding().encodeToString(hash);

            if (token.equals(expectedToken)) {
                return ResponseEntity.ok(Map.of("authenticated", true, "user", masterUser));
            }
        } catch (Exception ignored) {}

        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("authenticated", false));
    }
}
