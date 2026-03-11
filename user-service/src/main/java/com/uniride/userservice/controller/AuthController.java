package com.uniride.userservice.controller;

import com.uniride.userservice.dto.request.LoginRequest;
import com.uniride.userservice.dto.request.RefreshTokenRequest;
import com.uniride.userservice.dto.response.ApiResponse;
import com.uniride.userservice.dto.response.AuthResponse;
import com.uniride.userservice.security.JwtService;
import com.uniride.userservice.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
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

    private String obterIpReal(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            return xff.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
