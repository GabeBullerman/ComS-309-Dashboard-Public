package edu.iastate.dashboard309.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AnnouncementRequest(
    @NotBlank @Size(max = 1000) String message
) {}
