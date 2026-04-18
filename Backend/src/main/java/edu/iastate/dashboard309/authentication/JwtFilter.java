package edu.iastate.dashboard309.authentication;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import edu.iastate.dashboard309.service.JwtService;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class JwtFilter extends OncePerRequestFilter{
    private final JwtService jwtService;
    private final CustomUserDetailsService userDetailsService;

    public JwtFilter(JwtService jwtService, CustomUserDetailsService userDetailsService){
        this.jwtService = jwtService;
        this.userDetailsService = userDetailsService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) throws ServletException, IOException{
        String authHeader = request.getHeader("Authorization");

        // If the header is invalid, return
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        // Remove "Bearer " from header to start parsing the actual token
        String token = authHeader.substring(7);

        try{
            // Extract information from token
            Claims claims = jwtService.validateAccessToken(token);
            String username = claims.getSubject();
            List<String> roles = claims.get("roles", List.class);
            List<String> permissions = claims.get("permissions", List.class);

            if (username != null) {
                UserDetails userDetails = userDetailsService.loadUserByUsername(username);

                List<GrantedAuthority> authorities = buildAuthorities(roles, permissions);

                UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(userDetails, null, authorities);

                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                // JWT always wins — clear any session-based auth (e.g. leftover OAuth2 session)
                SecurityContextHolder.clearContext();
                SecurityContextHolder.getContext().setAuthentication(authentication);
            }

            filterChain.doFilter(request, response);
        } catch (ExpiredJwtException e){
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Token is expired");
        } catch (JwtException e){
            response.sendError(HttpServletResponse.SC_NOT_FOUND, "Token is invalid");
        }
    }


    // Puts roles and permissions into authorities.
    private List<GrantedAuthority> buildAuthorities(List<String> roles, List<String> permissions) {

        List<GrantedAuthority> authorities = new ArrayList<>();

        if (roles != null) {
            authorities.addAll(
                roles.stream()
                    .map(SimpleGrantedAuthority::new)
                    .toList()
            );
        }

        if (permissions != null) {
            authorities.addAll(
                permissions.stream()
                .map(SimpleGrantedAuthority::new)
                .toList()
            );
        }

        return authorities;
    }
}
