package edu.iastate.dashboard309.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

public record CalendarEventDto(
    Long id,
    String title,
    String description,
    LocalDate eventDate,
    LocalTime eventTime,
    String netid,
    String eventType,
    boolean completed,
    LocalDateTime createdAt
) {}
