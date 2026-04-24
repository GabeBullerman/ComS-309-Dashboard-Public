package edu.iastate.dashboard309.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.time.LocalTime;

public record CalendarEventCreateRequest(
    @NotBlank String title,
    String description,
    @NotNull LocalDate eventDate,
    LocalTime eventTime,
    String eventType
) {}
