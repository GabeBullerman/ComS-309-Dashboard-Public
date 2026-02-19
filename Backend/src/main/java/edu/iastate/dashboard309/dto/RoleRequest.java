package edu.iastate.dashboard309.dto;

import java.util.List;

import jakarta.validation.constraints.NotBlank;

public record RoleRequest(
        Long id,
        @NotBlank String roleName,
        List<String> permissions
) {
}
