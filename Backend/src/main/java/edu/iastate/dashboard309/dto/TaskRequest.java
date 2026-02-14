package edu.iastate.dashboard309.dto;

import jakarta.validation.constraints.NotBlank;

public record TaskRequest(
        @NotBlank String title,
        String description,
        @NotBlank String taNetid
) {
}
