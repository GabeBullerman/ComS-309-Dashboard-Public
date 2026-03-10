package edu.iastate.dashboard309.dto;

import java.util.List;

public record UserRequest(
        Long id,
        String name,
        String netid,
        String password,
        List<String> role,
        List<String> permission,
        Integer contributions,
        String projectRole
) {
}
