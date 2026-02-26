package edu.iastate.dashboard309.service;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import edu.iastate.dashboard309.dto.UserRequest;
import edu.iastate.dashboard309.dto.TeamRequest;
import edu.iastate.dashboard309.model.Team;
import edu.iastate.dashboard309.model.User;
import edu.iastate.dashboard309.repository.TeamRepository;
import edu.iastate.dashboard309.repository.UserRepository;

@Service
public class TeamService {
    private final TeamRepository teamRepository;
    private final UserRepository userRepository;
    private final UserService userService;

    public TeamService(TeamRepository teamRepository, UserRepository userRepository, UserService userService) {
        this.teamRepository = teamRepository;
        this.userRepository = userRepository;
        this.userService = userService;
    }

    @Transactional 
    public TeamRequest getTeamById(Long id){
        Team team = teamRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Team not found"));
        UserRequest ta = null;
        if (team.getTa() != null) {
            Long taId = team.getTa().getId();
            ta = userService.getUserById(taId);
        }

        String taNetid = ta != null ? ta.netid() : null;

        List<UserRequest> students = team.getStudents().stream()
            .map(u -> userService.getUserById(u.getId()))
            .toList();
        
        return new TeamRequest(team.getId(), team.getName(), team.getSection(), taNetid, students, team.getStatus(), team.getTaNotes(), team.getGitlab());
    }

    @Transactional
    public List<TeamRequest> getTeamByTaNetid(String netid){
        List<Team> teams = teamRepository.findByTaNetid(netid);
        if(teams.isEmpty()){
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Teams not found");
        }
                
        return teams.stream()
            .map(t -> getTeamById(t.getId()))
            .toList();
    }

    @Transactional 
    public List<TeamRequest> getAllTeams(){
        List<Team> teams = teamRepository.findAll();
        return teams.stream()
            .map(t -> getTeamById(t.getId()))
            .toList();
    }

    @Transactional
    public void addStudentToTeam(Long teamId, Long studentId){
        Team team = teamRepository.findById(teamId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Team not found"));
        User student = userRepository.findById(studentId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Student not found"));
        team.addStudent(student);
        student.setTeam(team);
    }

    @Transactional
    public void removeStudentFromTeam(Long teamId, Long studentId){
        Team team = teamRepository.findById(teamId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Team not found"));
        User student = userRepository.findById(studentId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Student not found"));
        team.removeStudent(student);
        student.setTeam(null);
    }
}
