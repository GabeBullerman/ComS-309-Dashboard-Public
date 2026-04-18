package edu.iastate.dashboard309.dto;

import java.time.LocalDateTime;

import jakarta.validation.constraints.NotBlank;

public record TaskRequest(
        Long id,
        @NotBlank String title,
        String description,
        LocalDateTime dueDate,
        String assignedToNetid,
        String assignedByNetid,
        String status
) {
}
