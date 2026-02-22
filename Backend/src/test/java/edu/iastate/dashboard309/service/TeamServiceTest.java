package edu.iastate.dashboard309.service;

import static org.assertj.core.api.Assertions.assertThat;

import edu.iastate.dashboard309.dto.TeamRequest;
import edu.iastate.dashboard309.model.Team;
import edu.iastate.dashboard309.model.User;
import edu.iastate.dashboard309.repository.TeamRepository;
import edu.iastate.dashboard309.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

@DataJpaTest
@Import({TeamService.class, UserService.class})
@ActiveProfiles("test")
class TeamServiceTest {

    @Autowired
    private TeamRepository teamRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TeamService teamService;

    @Test
    void getTeamById_returnsTeamRequest() {
        User ta = new User();
        ta.setName("TA One");
        ta.setNetid("ta1");
        ta.setPassword("pw");
        userRepository.save(ta);

        Team team = new Team();
        team.setName("Team A");
        team.setSection(1);
        team.setTa(ta);
        team.setStatus(0);
        team.setTaNotes("notes");
        team.setGitlab("gitlab");
        teamRepository.save(team);

        User student = new User();
        student.setName("Student One");
        student.setNetid("stud1");
        student.setPassword("pw");
        student.setTeam(team);
        userRepository.save(student);

        team.addStudent(student);
        teamRepository.save(team);

        TeamRequest result = teamService.getTeamById(team.getId());

        assertThat(result.name()).isEqualTo("Team A");
        assertThat(result.taNetid()).isEqualTo("ta1");
        assertThat(result.students()).hasSize(1);
    }

    @Test
    void addStudentToTeam_persistsStudentTeamLink() {
        User ta = new User();
        ta.setName("TA One");
        ta.setNetid("ta2");
        ta.setPassword("pw");
        userRepository.save(ta);

        Team team = new Team();
        team.setName("Team B");
        team.setSection(2);
        team.setTa(ta);
        teamRepository.save(team);

        User student = new User();
        student.setName("Student Two");
        student.setNetid("stud2");
        student.setPassword("pw");
        userRepository.save(student);

        teamService.addStudentToTeam(team.getId(), student.getId());

        Team updated = teamRepository.findById(team.getId()).orElseThrow();
        assertThat(updated.getStudents()).hasSize(1);
    }
}
