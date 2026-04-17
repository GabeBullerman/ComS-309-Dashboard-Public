package edu.iastate.dashboard309.service;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import edu.iastate.dashboard309.dto.UserRequest;
import edu.iastate.dashboard309.model.Team;
import edu.iastate.dashboard309.model.User;
import edu.iastate.dashboard309.repository.AtRiskOverrideRepository;
import edu.iastate.dashboard309.repository.AttendanceRepository;
import edu.iastate.dashboard309.repository.CommentRepository;
import edu.iastate.dashboard309.repository.DemoPerformanceRepository;
import edu.iastate.dashboard309.repository.RefreshTokenRepository;
import edu.iastate.dashboard309.repository.RoleRepository;
import edu.iastate.dashboard309.repository.TaskRepository;
import edu.iastate.dashboard309.repository.TeamRepository;
import edu.iastate.dashboard309.repository.UserRepository;
import edu.iastate.dashboard309.repository.WeeklyPerformanceRepository;

@Service
public class UserService {
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final AttendanceRepository attendanceRepository;
    private final DemoPerformanceRepository demoPerformanceRepository;
    private final WeeklyPerformanceRepository weeklyPerformanceRepository;
    private final AtRiskOverrideRepository atRiskOverrideRepository;
    private final CommentRepository commentRepository;
    private final TaskRepository taskRepository;
    private final TeamRepository teamRepository;

    public UserService(UserRepository userRepository,
                       RoleRepository roleRepository,
                       RefreshTokenRepository refreshTokenRepository,
                       AttendanceRepository attendanceRepository,
                       DemoPerformanceRepository demoPerformanceRepository,
                       WeeklyPerformanceRepository weeklyPerformanceRepository,
                       AtRiskOverrideRepository atRiskOverrideRepository,
                       CommentRepository commentRepository,
                       TaskRepository taskRepository,
                       TeamRepository teamRepository) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.attendanceRepository = attendanceRepository;
        this.demoPerformanceRepository = demoPerformanceRepository;
        this.weeklyPerformanceRepository = weeklyPerformanceRepository;
        this.atRiskOverrideRepository = atRiskOverrideRepository;
        this.commentRepository = commentRepository;
        this.taskRepository = taskRepository;
        this.teamRepository = teamRepository;
    }

    @Transactional
    private UserRequest userToRequest(User user){
        return new UserRequest(user.getId(), user.getName(), user.getNetid(), user.getPassword(), user.getRoleNames(), user.getPermissions().stream().collect(Collectors.toList()), user.getContributions(), user.getProjectRole());
    }

    @Transactional
    public UserRequest getUserById(Long id){
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        // String roleName = user.getRole().isEmpty() ? "UNASSIGNED" : user.getRole().get(0).getRoleName();
        return userToRequest(user);
    }

    @Transactional
    public UserRequest getUserByNetid(String netid){
        User user = userRepository.findByNetid(netid)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        // String roleName = user.getRole().isEmpty() ? "UNASSIGNED" : user.getRole().get(0).getRoleName();
        return userToRequest(user);
    }

    @Transactional
    public List<UserRequest> getTaByInitials(String initials){
        List<User> users = userRepository.findTaByInitials(initials);
        return users.stream()
            .map(u -> userToRequest(u))
            .toList();
    }

    @Transactional
    public UserRequest getUserByGoogleId(String googleId){
        User user = userRepository.findByGoogleId(googleId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        // String roleName = user.getRole().isEmpty() ? "UNASSIGNED" : user.getRole().get(0).getRoleName();
        return userToRequest(user);
    }
    
    @Transactional 
    public List<UserRequest> getAllUsers(){
        List<User> users = userRepository.findAll();
        return users.stream()
            .map(u -> userToRequest(u))
            .toList();
    }

    @Transactional
    public List<UserRequest> getTAsWithInitials(String initials){
        List<User> users = userRepository.findTaByInitials(initials);
        return users.stream()
            .map(u -> userToRequest(u))
            .toList();
    }

    @Transactional
    public Page<UserRequest> getUsers(String role, String search, Pageable pageable) {
        Page<User> page;

        if (search == null) {
            page = userRepository.findUsersWithoutSearch(role, pageable);
        } else {
            page = userRepository.findUsersWithSearch(role, search, pageable);
        }

        return page.map(this::userToRequest);
    }

    @Transactional
    public List<UserRequest> getUsersWithRoleName(String roleName){
        roleRepository.findByRoleName(roleName)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Role not found"));
        List<User> users = userRepository.findByRoles_roleName(roleName);
        return users.stream()
            .map(u -> userToRequest(u))
            .toList();
    }

    @Transactional
    public void deleteUser(Long id){
        User user = userRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        String netid = user.getNetid();

        attendanceRepository.deleteByStudentId(id);
        demoPerformanceRepository.deleteByStudentId(id);
        weeklyPerformanceRepository.deleteByStudentId(id);
        atRiskOverrideRepository.deleteByStudentNetid(netid);

        commentRepository.deleteBySenderIdOrReceiverId(id, id);
        taskRepository.deleteByAssignedToIdOrAssignedById(id, id);

        List<Team> managedTeams = teamRepository.findByTaId(id);
        for (Team team : managedTeams) {
            team.setTa(null);
        }
        if (!managedTeams.isEmpty()) {
            teamRepository.saveAll(managedTeams);
        }

        refreshTokenRepository.deleteByUserId(id);

        user.getRole().clear();
        userRepository.save(user);
        userRepository.delete(user);
    }
}
