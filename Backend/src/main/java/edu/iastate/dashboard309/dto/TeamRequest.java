package edu.iastate.dashboard309.dto;

import java.util.List;

public record TeamRequest(
        Long id,
        String name,
        Integer section,
        String taNetid,
        List<UserRequest> students,
        Integer status,
        String taNotes,
        String gitlab
) {
}
