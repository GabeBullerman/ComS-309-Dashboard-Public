package edu.iastate.dashboard309.dto;

import java.time.LocalDateTime;

public record AnnouncementDto(
    Long id,
    String message,
    String createdByNetid,
    String createdByName,
    LocalDateTime createdAt
) {}
