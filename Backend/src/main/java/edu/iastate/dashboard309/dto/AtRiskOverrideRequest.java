package edu.iastate.dashboard309.dto;

import jakarta.validation.constraints.NotBlank;
import java.time.LocalDateTime;

public record AtRiskOverrideRequest(
    Long id,
    @NotBlank String studentNetid,
    @NotBlank String reason,
    String flaggedByNetid,
    LocalDateTime createdAt
) {}
