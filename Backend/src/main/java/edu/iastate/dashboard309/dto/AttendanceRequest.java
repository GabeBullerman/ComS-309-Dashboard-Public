package edu.iastate.dashboard309.dto;

import java.time.LocalDate;

import edu.iastate.dashboard309.model.AttendanceStatus;
import edu.iastate.dashboard309.model.AttendanceType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record AttendanceRequest(
    Long id,
    @NotBlank String studentNetid,
    @NotNull LocalDate attendanceDate,
    @NotNull AttendanceStatus status,
    @NotNull AttendanceType type
) {
}
