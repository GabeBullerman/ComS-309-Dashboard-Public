package edu.iastate.dashboard309.dto;

import jakarta.validation.constraints.NotBlank;

public record UserRequest(
        Long id,
        @NotBlank String name,
        @NotBlank String netid,
        @NotBlank String password,
        // TODO: Change to be able to have multiple roles
        @NotBlank String role
) {
}
