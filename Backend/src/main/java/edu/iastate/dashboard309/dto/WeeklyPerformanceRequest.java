package edu.iastate.dashboard309.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record WeeklyPerformanceRequest(
    Long id,
    @NotBlank String studentNetid,
    @NotNull @Min(0) @Max(2) Integer codeScore,
    @NotNull @Min(0) @Max(2) Integer teamworkScore
) {
}
