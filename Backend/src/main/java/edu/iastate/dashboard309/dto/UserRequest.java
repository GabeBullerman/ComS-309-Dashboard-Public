package edu.iastate.dashboard309.dto;

import jakarta.validation.constraints.NotBlank;

public record UserRequest(
        @NotBlank String name,
        @NotBlank String netid,
        @NotBlank String password,
        // TODO: Change to be able to have multiple roles
        @NotBlank String role
) {
}
