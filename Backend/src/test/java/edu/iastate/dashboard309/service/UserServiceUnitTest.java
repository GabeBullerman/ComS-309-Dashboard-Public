package edu.iastate.dashboard309.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

import edu.iastate.dashboard309.dto.UserRequest;
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
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
class UserServiceUnitTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private RoleRepository roleRepository;

    @Mock
    private RefreshTokenRepository refreshTokenRepository;

    @Mock
    private AttendanceRepository attendanceRepository;

    @Mock
    private DemoPerformanceRepository demoPerformanceRepository;

    @Mock
    private WeeklyPerformanceRepository weeklyPerformanceRepository;

    @Mock
    private AtRiskOverrideRepository atRiskOverrideRepository;

    @Mock
    private CommentRepository commentRepository;

    @Mock
    private TaskRepository taskRepository;

    @Mock
    private TeamRepository teamRepository;

    @InjectMocks
    private UserService userService;

    @Test
    void getUserById_returnsUnassignedWhenNoRole() {
        User user = new User();
        user.setId(1L);
        user.setName("Alex");
        user.setNetid("alex1");
        user.setPassword("secret");

        when(userRepository.findById(1L)).thenReturn(Optional.of(user));

        UserRequest result = userService.getUserById(1L);

        assertThat(result.role()).isEmpty(); // Update this if you construct UserRequest manually elsewhere
    }

    @Test
    void getAllUsers_returnsAllUsers() {
        User userOne = new User();
        userOne.setId(1L);
        userOne.setName("Alex");
        userOne.setNetid("alex1");
        userOne.setPassword("pw1");

        User userTwo = new User();
        userTwo.setId(2L);
        userTwo.setName("Sam");
        userTwo.setNetid("sam1");
        userTwo.setPassword("pw2");

        when(userRepository.findAll()).thenReturn(List.of(userOne, userTwo));

        List<UserRequest> results = userService.getAllUsers();

        assertThat(results).hasSize(2);
        assertThat(results.get(0).netid()).isEqualTo("alex1");
        assertThat(results.get(1).netid()).isEqualTo("sam1");
    }

    @Test
    void getUsersWithRoleName_throwsWhenRoleMissing() {
        when(roleRepository.findByRoleName("MISSING")).thenReturn(Optional.empty());
        assertThrows(ResponseStatusException.class,
            () -> userService.getUsersWithRoleName("MISSING"));
    }
}
