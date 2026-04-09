package edu.iastate.dashboard309.controller;

import edu.iastate.dashboard309.dto.TeamRequest;
import edu.iastate.dashboard309.dto.UserRequest;
import edu.iastate.dashboard309.model.Team;
import edu.iastate.dashboard309.model.User;
import edu.iastate.dashboard309.repository.UserRepository;
import edu.iastate.dashboard309.service.TeamService;
import edu.iastate.dashboard309.repository.TeamRepository;
import jakarta.validation.Valid;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.data.jpa.repository.Query;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
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

    // @PreAuthorize("hasAuthority('SEE_ALL_TEAMS')")
    @GetMapping
    public Page<TeamRequest> list(@RequestParam(required = false) String taNetid,
                                  @RequestParam(required = false) Integer section,
                                  @RequestParam(required = false) Integer status,
                                  @PageableDefault(size = 20) Pageable pageable) {
        String normalizedTaNetid = normalize(taNetid);
        return teamService.getTeams(normalizedTaNetid, section, status, pageable);
    }

    @GetMapping("/{id}")
    @Query("SELECT t FROM Team t LEFT JOIN FETCH t.students WHERE t.id = :id")
    public TeamRequest get(@PathVariable Long id) {
        return teamService.getTeamById(id);
    }

    @GetMapping("/{id}/students")
    public List<UserRequest> getStudents(@PathVariable Long id) {
        return teamService.getTeamStudents(id);
    }

    @GetMapping("/{id}/ta")
    public UserRequest getTa(@PathVariable Long id) {
        return teamService.getTeamTa(id);
    }

    @GetMapping("/{id}/status")
    public Integer getStatus(@PathVariable Long id) {
        Team team = teamRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Team not found"));
        return team.getStatus();
    }

    // @PreAuthorize("hasAuthority('CREATE_TEAMS')")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TeamRequest create(@Valid @RequestBody TeamRequest request) {
        if (request.taNetid() != null && !userRepository.existsByNetid(request.taNetid())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "TA does not exist");
        }
        Team team = new Team();
        applyRequest(team, request);
        teamRepository.save(team);
        return teamService.getTeamById(team.getId());
    }

    // @PreAuthorize("hasAuthority('UPDATE_TEAMS')")
    @PutMapping("/{id}")
    public TeamRequest update(@PathVariable Long id, @Valid @RequestBody TeamRequest request) {
        if (request.taNetid() != null && !userRepository.existsByNetid(request.taNetid())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "TA does not exist");
        }
        Team team = teamRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Team not found"));
        applyRequest(team, request);
        teamRepository.save(team);
        return teamService.getTeamById(team.getId());
    }

    // @PreAuthorize("hasAuthority('UPDATE_TEAMS')")
    @PutMapping("/{id}/add/{studentId}")
    public void addStudent(@PathVariable Long id, @PathVariable Long studentId){
        teamService.addStudentToTeam(id, studentId);
    }

    // @PreAuthorize("hasAuthority('UPDATE_TEAMS')")
    @PutMapping("/{id}/remove/{studentId}")
    public void removeStudent(@PathVariable Long id, @PathVariable Long studentId){
        teamService.removeStudentFromTeam(id, studentId);
    }

    // @PreAuthorize("hasAuthority('DELETE_TEAMS')")
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        teamService.clearStudents(id);
        teamRepository.deleteById(id);
    }

    private void applyRequest(Team team, TeamRequest request) {
        if(request.name() != null){
            team.setName(request.name());
        }
        if(request.section() != null){
            team.setSection(request.section());
        }
        if(request.taNetid() != null){
            if (!userRepository.existsByNetid(request.taNetid())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "TA does not exist");
            }
            User ta = userRepository.findByNetid(request.taNetid())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "TA not found"));
            team.setTa(ta);
        }
        if(request.status() != null){
            team.setStatus(request.status());
        }
        if(request.taNotes() != null){
            team.setTaNotes(request.taNotes());
        }
        if(request.gitlab() != null){
            team.setGitlab(request.gitlab());
        }
        if(request.discord() != null){
            team.setDiscord(request.discord());
        }
    }

    private String normalize(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
