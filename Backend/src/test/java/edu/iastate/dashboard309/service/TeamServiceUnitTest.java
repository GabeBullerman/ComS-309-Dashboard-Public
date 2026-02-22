package edu.iastate.dashboard309.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import edu.iastate.dashboard309.dto.TeamRequest;
import edu.iastate.dashboard309.dto.UserRequest;
import edu.iastate.dashboard309.model.Team;
import edu.iastate.dashboard309.model.User;
import edu.iastate.dashboard309.repository.TeamRepository;
import edu.iastate.dashboard309.repository.UserRepository;
import java.util.HashSet;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class TeamServiceUnitTest {

    @Mock
    private TeamRepository teamRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private UserService userService;

    @InjectMocks
    private TeamService teamService;

    @Test
    void getTeamById_returnsTeamRequest() {
        User ta = new User();
        ta.setId(10L);
        ta.setNetid("ta1");
        ta.setName("TA One");
        ta.setPassword("pw");

        User student = new User();
        student.setId(20L);
        student.setNetid("stud1");
        student.setName("Student One");
        student.setPassword("pw");

        Team team = new Team();
        team.setId(1L);
        team.setName("Team A");
        team.setSection(1);
        team.setTa(ta);
        team.setStatus(0);
        team.setTaNotes("notes");
        team.setGitlab("gitlab");

        Set<User> students = new HashSet<>();
        students.add(student);
        ReflectionTestUtils.setField(team, "students", students);

        when(teamRepository.findById(1L)).thenReturn(Optional.of(team));
        when(userService.getUserById(10L))
            .thenReturn(new UserRequest(10L, "TA One", "ta1", "pw", "UNASSIGNED"));
        when(userService.getUserById(20L))
            .thenReturn(new UserRequest(20L, "Student One", "stud1", "pw", "UNASSIGNED"));

        TeamRequest result = teamService.getTeamById(1L);

        assertThat(result.name()).isEqualTo("Team A");
        assertThat(result.taNetid()).isEqualTo("ta1");
        assertThat(result.students()).hasSize(1);
    }

    @Test
    void addStudentToTeam_addsStudent() {
        Team team = new Team();
        team.setId(1L);
        ReflectionTestUtils.setField(team, "students", new HashSet<>());

        User student = mock(User.class);

        when(teamRepository.findById(1L)).thenReturn(Optional.of(team));
        when(userRepository.findById(2L)).thenReturn(Optional.of(student));

        teamService.addStudentToTeam(1L, 2L);

        assertThat(team.getStudents()).contains(student);
        verify(student).setTeam(team);
    }

    @Test
    void removeStudentFromTeam_removesStudent() {
        Team team = new Team();
        team.setId(1L);
        Set<User> students = new HashSet<>();
        ReflectionTestUtils.setField(team, "students", students);

        User student = mock(User.class);
        students.add(student);

        when(teamRepository.findById(1L)).thenReturn(Optional.of(team));
        when(userRepository.findById(2L)).thenReturn(Optional.of(student));

        teamService.removeStudentFromTeam(1L, 2L);

        assertThat(team.getStudents()).doesNotContain(student);
        verify(student).setTeam(null);
    }
}
