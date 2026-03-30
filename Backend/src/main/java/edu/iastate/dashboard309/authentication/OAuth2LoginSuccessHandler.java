package edu.iastate.dashboard309.authentication;

import java.io.IOException;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import edu.iastate.dashboard309.dto.UserRequest;
import edu.iastate.dashboard309.model.User;
import edu.iastate.dashboard309.repository.UserRepository;
import edu.iastate.dashboard309.service.JwtService;
import edu.iastate.dashboard309.service.UserService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class OAuth2LoginSuccessHandler implements AuthenticationSuccessHandler {

    private final UserRepository userRepository;
    private final UserService userService;
    private final JwtService jwtService;

    @Value("${app.frontend-url}")
    private String frontendUrl;

    public OAuth2LoginSuccessHandler(UserRepository userRepository, UserService userService, JwtService jwtService) {
        this.userRepository = userRepository;
        this.userService = userService;
        this.jwtService = jwtService;
    }

    @Override
    @Transactional
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
                                        Authentication authentication) throws IOException {
        OAuth2AuthenticationToken oauthToken = (OAuth2AuthenticationToken) authentication;
        OAuth2User principal = oauthToken.getPrincipal();

        String email = principal.getAttribute("email");
        String googleId = principal.getAttribute("sub");

        if (email == null || googleId == null) {
            response.sendRedirect(frontendUrl + "?error=google_auth_failed");
            return;
        }

        String netid = email.split("@")[0];

        UserRequest userRequest;
        try {
            User user = userRepository.findByNetid(netid)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No account found for " + netid));

            // Link Google ID on first sign-in
            if (user.getGoogleId() == null) {
                user.setGoogleId(googleId);
                userRepository.save(user);
            }

            userRequest = userService.getUserByNetid(netid);
        } catch (ResponseStatusException e) {
            response.sendRedirect(frontendUrl + "?error=user_not_found");
            return;
        }

        String accessToken = jwtService.createAccessToken(userRequest);
        String refreshToken = jwtService.createRefreshToken(userRequest);

        Cookie cookie = jwtService.createRefreshTokenCookie(refreshToken);
        response.addCookie(cookie);

        // Pass access token in URL fragment so it is never sent to the server
        response.sendRedirect(frontendUrl + "#googleToken=" + accessToken);
    }
}
