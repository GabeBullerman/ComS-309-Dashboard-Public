package edu.iastate.dashboard309.dto;

import java.util.List;

import jakarta.validation.constraints.NotBlank;

public record TeamRequest(
        @NotBlank String name,
        Integer section,
        UserRequest ta,
        List<UserRequest> students,
        Integer status,
        String taNotes,
        String gitlab
) {
}
