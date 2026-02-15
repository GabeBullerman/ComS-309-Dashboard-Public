package edu.iastate.dashboard309.dto;

import jakarta.validation.constraints.NotBlank;

public record RoleRequest(
        @NotBlank String roleName
) {
}
