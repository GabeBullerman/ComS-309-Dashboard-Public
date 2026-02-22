package edu.iastate.dashboard309.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import edu.iastate.dashboard309.dto.UserRequest;
import edu.iastate.dashboard309.service.JwtService;
import edu.iastate.dashboard309.service.UserService;
import io.jsonwebtoken.Claims;
import jakarta.validation.Valid;



@RestController
@RequestMapping("/api/auth")
public class AuthenticationController {
    private final UserService userService;
    private final JwtService jwtService;

    public AuthenticationController(UserService userService, JwtService jwtService){
        this.userService = userService;
        this.jwtService = jwtService;
    }

    @PostMapping("/login")
    public String login(@Valid @RequestBody UserRequest loginDetail) {
        UserRequest user = userService.getUserByNetid(loginDetail.netid());

        // Verify password
        if(!loginDetail.password().equals(user.password())){
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "User and password do not match");
        }

        // TODO: Refresh token

        return jwtService.createAccessToken(user);
    }
    
    @PostMapping("/logout")
    public ResponseEntity<?> logout(Authentication authentication) {
        String netid = authentication.getName();

        // TODO: Additional logout procedures
        
        return ResponseEntity.ok("Logged out " + netid);
    }

    /*
    @PostMapping("refresh")
    public ResponseEntity<?> refresh(){
        return null;
    }
    */
    @GetMapping("/testVerification")
    public Claims testVerification(@RequestParam String token){
        return jwtService.validateAccessToken(token);
    }
    
}
