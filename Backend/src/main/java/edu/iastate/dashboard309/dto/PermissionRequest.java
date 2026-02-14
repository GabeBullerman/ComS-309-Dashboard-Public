package edu.iastate.dashboard309.dto;

import jakarta.validation.constraints.NotBlank;

public record PermissionRequest(
        @NotBlank String name
) {
}
