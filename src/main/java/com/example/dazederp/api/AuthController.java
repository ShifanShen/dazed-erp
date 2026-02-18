package com.example.dazederp.api;

import com.example.dazederp.domain.AppUser;
import com.example.dazederp.repo.AppUserRepository;
import com.example.dazederp.security.JwtService;
import jakarta.validation.constraints.NotBlank;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthenticationManager authManager;
    private final AppUserRepository users;
    private final JwtService jwtService;

    public AuthController(AuthenticationManager authManager, AppUserRepository users, JwtService jwtService) {
        this.authManager = authManager;
        this.users = users;
        this.jwtService = jwtService;
    }

    public record LoginRequest(@NotBlank String username, @NotBlank String password) {
    }

    public record LoginResponse(String token, String username, String displayName, String role) {
    }

    @PostMapping("/login")
    public LoginResponse login(@RequestBody LoginRequest req) {
        try {
            authManager.authenticate(new UsernamePasswordAuthenticationToken(req.username(), req.password()));
        } catch (Exception ex) {
            throw new BadCredentialsException("用户名或密码错误");
        }
        AppUser u = users.findByUsername(req.username()).orElseThrow(() -> new BadCredentialsException("用户不存在"));
        String token = jwtService.generate(u.getUsername(), Map.of("role", u.getRole().name()));
        return new LoginResponse(token, u.getUsername(), u.getDisplayName(), u.getRole().name());
    }
}

