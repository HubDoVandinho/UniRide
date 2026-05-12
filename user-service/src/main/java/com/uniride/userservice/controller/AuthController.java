package com.uniride.userservice.controller;

import com.uniride.userservice.dto.request.EsqueciSenhaRequest;
import com.uniride.userservice.dto.request.LoginRequest;
import com.uniride.userservice.dto.request.RedefinirSenhaRequest;
import com.uniride.userservice.dto.request.RefreshTokenRequest;
import com.uniride.userservice.dto.response.ApiResponse;
import com.uniride.userservice.dto.response.AuthResponse;
import com.uniride.userservice.security.JwtService;
import com.uniride.userservice.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final JwtService jwtService;

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest) {

        String ip = obterIpReal(httpRequest);
        AuthResponse response = authService.login(request, ip);
        return ResponseEntity.ok(ApiResponse.ok("Login efetuado com sucesso.", response));
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<AuthResponse>> refresh(
            @Valid @RequestBody RefreshTokenRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Token renovado.", authService.refreshToken(request)));
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(
            @RequestHeader("Authorization") String bearerToken) {
        Long userId = jwtService.extrairUserId(bearerToken.substring(7).trim());
        authService.logout(userId);
        return ResponseEntity.ok(ApiResponse.ok("Logout efetuado com sucesso."));
    }

    @PostMapping("/esqueci-senha")
    public ResponseEntity<ApiResponse<Void>> esqueciSenha(
            @Valid @RequestBody EsqueciSenhaRequest request) {
        authService.solicitarRecuperacaoSenha(request.getEmail());
        return ResponseEntity.ok(ApiResponse.ok("Se o e-mail estiver cadastrado, você receberá um código em instantes."));
    }

    @PostMapping("/redefinir-senha")
    public ResponseEntity<ApiResponse<Void>> redefinirSenha(
            @Valid @RequestBody RedefinirSenhaRequest request) {
        authService.redefinirSenha(request.getCodigo(), request.getNovaSenha());
        return ResponseEntity.ok(ApiResponse.ok("Senha redefinida com sucesso."));
    }

    @PostMapping("/reenviar-verificacao")
    public ResponseEntity<ApiResponse<Void>> reenviarVerificacao(
            @Valid @RequestBody EsqueciSenhaRequest request) {
        authService.reenviarVerificacao(request.getEmail());
        return ResponseEntity.ok(ApiResponse.ok("Se o e-mail estiver pendente de verificação, um novo link foi enviado."));
    }

    /**
     * GET /api/v1/auth/confirmar?token=...
     * Ativa a conta e retorna uma página HTML que abre o deep link do app.
     * Funciona mesmo em clientes de e-mail que bloqueiam redirects 302 para schemes customizados.
     */
    @GetMapping(value = "/confirmar", produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> confirmarEmail(@RequestParam String token) {
        boolean sucesso;
        try {
            authService.confirmarEmailInstitucional(token);
            sucesso = true;
        } catch (Exception e) {
            sucesso = false;
        }

        String html = sucesso ? paginaSucesso() : paginaErro();
        return ResponseEntity.ok().contentType(MediaType.TEXT_HTML).body(html);
    }

    private String paginaSucesso() {
        return """
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <title>UniRide — Conta ativada</title>
              <style>
                body { font-family: sans-serif; display:flex; align-items:center; justify-content:center;
                       min-height:100vh; margin:0; background:#f5f5f5; }
                .card { background:#fff; border-radius:16px; padding:40px 32px; text-align:center;
                        max-width:400px; box-shadow:0 4px 24px rgba(0,0,0,.1); }
                h1 { color:#22c55e; margin:0 0 12px; font-size:28px; }
                p  { color:#555; line-height:1.6; margin:0 0 24px; }
                a  { display:inline-block; background:#7B2FBE; color:#fff; padding:14px 28px;
                     border-radius:10px; text-decoration:none; font-weight:700; font-size:16px; }
                .sub { font-size:13px; color:#999; margin-top:16px; }
              </style>
            </head>
            <body>
              <div class="card">
                <h1>✓ Conta ativada!</h1>
                <p>Seu e-mail foi confirmado com sucesso.<br>Abra o UniRide no seu celular para fazer login.</p>
                <a href="uniride://conta-ativada">Abrir o UniRide</a>
                <p class="sub">Se o botão não funcionar, abra o app manualmente e faça login.</p>
              </div>
              <script>
                setTimeout(function() { window.location.href = 'uniride://conta-ativada'; }, 500);
              </script>
            </body>
            </html>
            """;
    }

    private String paginaErro() {
        return """
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <title>UniRide — Link inválido</title>
              <style>
                body { font-family: sans-serif; display:flex; align-items:center; justify-content:center;
                       min-height:100vh; margin:0; background:#f5f5f5; }
                .card { background:#fff; border-radius:16px; padding:40px 32px; text-align:center;
                        max-width:400px; box-shadow:0 4px 24px rgba(0,0,0,.1); }
                h1 { color:#ef4444; margin:0 0 12px; font-size:24px; }
                p  { color:#555; line-height:1.6; margin:0; }
              </style>
            </head>
            <body>
              <div class="card">
                <h1>Link inválido ou expirado</h1>
                <p>Este link de confirmação não é mais válido.<br>
                   Abra o UniRide e use a opção <strong>"Reenviar e-mail"</strong> para receber um novo link.</p>
              </div>
            </body>
            </html>
            """;
    }

    private String obterIpReal(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            return xff.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
