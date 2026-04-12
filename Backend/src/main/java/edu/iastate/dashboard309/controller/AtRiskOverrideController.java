package edu.iastate.dashboard309.controller;

import edu.iastate.dashboard309.dto.AtRiskOverrideRequest;
import edu.iastate.dashboard309.model.AtRiskOverride;
import edu.iastate.dashboard309.repository.AtRiskOverrideRepository;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/at-risk-overrides")
public class AtRiskOverrideController {

    private final AtRiskOverrideRepository repo;

    public AtRiskOverrideController(AtRiskOverrideRepository repo) {
        this.repo = repo;
    }

    @GetMapping
    public List<AtRiskOverrideRequest> list() {
        return repo.findAll().stream().map(this::toDto).toList();
    }

    @GetMapping("/student/{netid}")
    public List<AtRiskOverrideRequest> getByStudent(@PathVariable String netid) {
        return repo.findByStudentNetid(netid).stream().map(this::toDto).toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public AtRiskOverrideRequest create(@Valid @RequestBody AtRiskOverrideRequest request,
                                        Authentication auth) {
        AtRiskOverride override = new AtRiskOverride();
        override.setStudentNetid(request.studentNetid());
        override.setReason(request.reason());
        override.setFlaggedByNetid(auth != null ? auth.getName() : "unknown");
        return toDto(repo.save(override));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        if (!repo.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Override not found");
        }
        repo.deleteById(id);
    }

    @DeleteMapping("/student/{netid}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteByStudent(@PathVariable String netid) {
        repo.deleteByStudentNetid(netid);
    }

    private AtRiskOverrideRequest toDto(AtRiskOverride o) {
        return new AtRiskOverrideRequest(o.getId(), o.getStudentNetid(), o.getReason(),
                o.getFlaggedByNetid(), o.getCreatedAt());
    }
}
