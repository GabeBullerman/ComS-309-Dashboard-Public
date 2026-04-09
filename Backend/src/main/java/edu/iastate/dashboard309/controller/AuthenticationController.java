package edu.iastate.dashboard309.controller;

import java.util.Arrays;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;

import edu.iastate.dashboard309.dto.GoogleAuthRequest;
import edu.iastate.dashboard309.dto.UserRequest;
import edu.iastate.dashboard309.model.RefreshToken;
import edu.iastate.dashboard309.model.User;
import edu.iastate.dashboard309.repository.RefreshTokenRepository;
import edu.iastate.dashboard309.service.GoogleAuthService;
import edu.iastate.dashboard309.service.JwtService;
import edu.iastate.dashboard309.service.UserService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;


@RestController
@RequestMapping("/api/auth")
public class AuthenticationController {

    private final PasswordEncoder passwordEncoder;
    private final UserService userService;
    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtService jwtService;
    private final GoogleAuthService googleAuthService;

    public AuthenticationController(UserService userService, JwtService jwtService, GoogleAuthService googleAuthService, RefreshTokenRepository refreshTokenRepository, PasswordEncoder passwordEncoder){
        this.userService = userService;
        this.jwtService = jwtService;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.googleAuthService = googleAuthService;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody UserRequest loginDetail, HttpServletResponse response) {
        UserRequest user = userService.getUserByNetid(loginDetail.netid());

        // Verify password
        if(!passwordEncoder.matches(loginDetail.password(), user.password())){
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "User and password do not match");
        }

        // Refresh token
        String refreshToken = jwtService.createRefreshToken(user);
        Cookie cookie = jwtService.createRefreshTokenCookie(refreshToken);
        response.addCookie(cookie);

        return ResponseEntity.ok(jwtService.createAccessToken(user));
    }

    @PostMapping("/login/google")
    public ResponseEntity<?> googleLogin(@RequestBody GoogleAuthRequest request, HttpServletResponse response) throws Exception{
        User user = googleAuthService.authenticate(request.tokenId());
        UserRequest userRequest = userService.getUserByNetid(user.getNetid());

        String refreshToken = jwtService.createRefreshToken(userRequest);
        Cookie cookie = jwtService.createRefreshTokenCookie(refreshToken);
        response.addCookie(cookie);

        return ResponseEntity.ok(jwtService.createAccessToken(userRequest));
    }
    
    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) return ResponseEntity.ok("Logged out");
        String t = Arrays.stream(cookies)
            .filter(c -> c.getName().equals("refreshToken"))
            .findFirst()
            .map(Cookie::getValue)
            .orElse(null);
        if (t != null) jwtService.deleteRefreshToken(t);
        return ResponseEntity.ok("Logged out");
    }


    @PostMapping("/refresh")
    public String refresh(HttpServletRequest request, HttpServletResponse response){
        Cookie[] cookies = request.getCookies();
        if (cookies == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "No refresh token");
        String t = Arrays.stream(cookies)
            .filter(c -> c.getName().equals("refreshToken"))
            .findFirst()
            .map(Cookie::getValue)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Refresh token not found"));
        
        String[] parts = t.split("\\.");
        UUID uuid = UUID.fromString(parts[0]);
        String secret = parts[1];

        RefreshToken token = refreshTokenRepository.findById(uuid)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Token not found"));
        
        // Find the user of the refresh token
        // Remove the refresh token from database when used
        User user = jwtService.validateRefreshToken(secret, token);
        UserRequest userRequest = userService.getUserById(user.getId());

        String refreshToken = jwtService.createRefreshToken(userRequest);
        Cookie cookie = jwtService.createRefreshTokenCookie(refreshToken);
        response.addCookie(cookie);
        
        return jwtService.createAccessToken(userRequest);
    }
}
