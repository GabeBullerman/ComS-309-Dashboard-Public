package edu.iastate.dashboard309.service;

import java.security.SecureRandom;
import java.util.Base64;
import java.util.Date;
import java.util.UUID;

import javax.crypto.SecretKey;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import edu.iastate.dashboard309.dto.UserRequest;
import edu.iastate.dashboard309.model.RefreshToken;
import edu.iastate.dashboard309.model.User;
import edu.iastate.dashboard309.repository.RefreshTokenRepository;
import edu.iastate.dashboard309.repository.UserRepository;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.http.Cookie;

@Service
public class JwtService {

    private final SecretKey secretKey;
    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;

    private final int MINUTES = 15;
    private final int DAYS = 14;

    public JwtService(@Value("${JWT_SECRET}") String secretKey, UserRepository userRepository, PasswordEncoder passwordEncoder, RefreshTokenRepository refreshTokenRepository){
        this.secretKey = Keys.hmacShaKeyFor(Base64.getDecoder().decode(secretKey));
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.refreshTokenRepository = refreshTokenRepository;
    }

    public String createAccessToken(UserRequest user){
        return Jwts.builder()
            .setSubject(user.netid())
            .claim("roles", user.role())
            .claim("permissions", user.permission())
            .setIssuedAt(new Date())
            .setExpiration(new Date(System.currentTimeMillis() + MINUTES * 60 * 1000))
            .signWith(secretKey)
            .compact();
    }

    @Transactional
    public String createRefreshToken(UserRequest userRequest){
        byte[] randomBytes = new byte[64];
        new SecureRandom().nextBytes(randomBytes);
        String secret = Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);

        User user = userRepository.findByNetid(userRequest.netid())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        RefreshToken token = new RefreshToken();
        token.setUser(user);
        token.setToken(passwordEncoder.encode(secret));
        token.setCreatedAt(new Date());
        token.setExpiresAt(new Date(System.currentTimeMillis() + DAYS * 24 * 60 * 60 * 1000));

        refreshTokenRepository.save(token);
        user.addRefreshToken(token);

        return token.getId() + "." + secret;
    }

    public Cookie createRefreshTokenCookie(String refreshToken){
        Cookie cookie = new Cookie("refreshToken", refreshToken);
        cookie.setHttpOnly(true);
        cookie.setSecure(true);
        cookie.setPath("/api/auth/refresh");
        cookie.setMaxAge(DAYS * 24 * 60 * 60);

        return cookie;
    }

    public Claims validateAccessToken(String token){
        try{
            Claims claims = Jwts.parserBuilder()
                .setSigningKey(secretKey)
                .build()
                .parseClaimsJws(token)
                .getBody();
            
            return claims;
        } catch(ExpiredJwtException e){
            throw e;
        } catch (Exception e){
            throw e;
        }
    }

    @Transactional
    public User validateRefreshToken(String secret, RefreshToken token){
        if(!passwordEncoder.matches(secret, token.getTokenHash())){
            System.out.println("token does not match");
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Refresh token is invalid");
        }
        else if(token.getExpiresAt().before(new Date())){
            System.out.println("expired");
            // Delete expired tokens
            refreshTokenRepository.delete(token);
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Refresh token is expired. Relogin to get new tokens.");
        }

        User user = token.getUser();
        // Once validated, delete token
        refreshTokenRepository.delete(token);

        return user;
    }

    @Transactional
    public void deleteRefreshToken(String t){
        String[] parts = t.split("\\.");
        UUID uuid = UUID.fromString(parts[0]);

        RefreshToken token = refreshTokenRepository.findById(uuid)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Token not found"));
        
        refreshTokenRepository.delete(token);
    }
}
