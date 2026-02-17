package edu.iastate.dashboard309.dto;

import jakarta.validation.constraints.NotBlank;

public record PermissionRequest(
        Long id,
        @NotBlank String name
) {
}
