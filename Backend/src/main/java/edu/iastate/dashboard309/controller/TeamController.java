package edu.iastate.dashboard309.controller;

import edu.iastate.dashboard309.dto.TeamRequest;
import edu.iastate.dashboard309.model.Team;
import edu.iastate.dashboard309.model.User;
import edu.iastate.dashboard309.repository.UserRepository;
import edu.iastate.dashboard309.service.TeamService;
import edu.iastate.dashboard309.repository.TeamRepository;
import jakarta.validation.Valid;
import java.util.List;

import org.springframework.data.jpa.repository.Query;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/teams")
public class TeamController {
    private final TeamRepository teamRepository;
    private final UserRepository userRepository;
    private final TeamService teamService;

    public TeamController(TeamRepository teamRepository, UserRepository userRepository, TeamService teamService) {
        this.teamRepository = teamRepository;
        this.userRepository = userRepository;
        this.teamService = teamService;
    }

    @GetMapping
    public List<TeamRequest> list(@RequestParam(required = false) String taNetid) {
        if (taNetid == null || taNetid.isBlank()) {
            return teamService.getAllTeams();
        }
        return teamService.getTeamByTaNetid(taNetid);
    }

    @GetMapping("/{id}")
    @Query("SELECT t FROM Team t LEFT JOIN FETCH t.students WHERE t.id = :id")
    public TeamRequest get(@PathVariable Long id) {
        return teamService.getTeamById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Team create(@Valid @RequestBody TeamRequest request) {
        if (request.ta() != null && !userRepository.existsByNetid(request.ta().netid())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "TA does not exist");
        }
        Team team = new Team();
        applyRequest(team, request);
        return teamRepository.save(team);
    }

    @PutMapping("/{id}")
    public Team update(@PathVariable Long id, @Valid @RequestBody TeamRequest request) {
        if (request.ta() != null && !userRepository.existsByNetid(request.ta().netid())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "TA does not exist");
        }
        Team team = teamRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Team not found"));
        applyRequest(team, request);
        return teamRepository.save(team);
    }

    @PutMapping("/{id}/{studentId}")
    public void addStudent(@PathVariable Long id, @PathVariable Long studentId){
        teamService.addStudentToTeam(id, studentId);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        if (!teamRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Team not found");
        }
        teamRepository.deleteById(id);
    }

    private void applyRequest(Team team, TeamRequest request) {
        if (request.ta() != null && !userRepository.existsByNetid(request.ta().netid())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "TA does not exist");
        }
        User ta = userRepository.findByNetid(request.ta().netid())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "TA not found"));
        team.setName(request.name());
        team.setSection(request.section());
        team.setTa(ta);
        team.setStatus(request.status());
        team.setTaNotes(request.taNotes());
        team.setGitlab(request.gitlab());
    }
}
