package edu.iastate.dashboard309.dto;

public record TokenRequest(
        String accessToken,
        String refreshToken
) {
}
