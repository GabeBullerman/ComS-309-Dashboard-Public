package edu.iastate.dashboard309.repository;

import static org.assertj.core.api.Assertions.assertThat;

import edu.iastate.dashboard309.model.Team;
import edu.iastate.dashboard309.model.User;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;

@DataJpaTest
@ActiveProfiles("test")
class TeamRepositoryTest {

    @Autowired
    private TeamRepository teamRepository;

    @Autowired
    private UserRepository userRepository;

    @Test
    void findByTaNetid_returnsTeams() {
        User ta = new User();
        ta.setName("TA One");
        ta.setNetid("ta1");
        ta.setPassword("pw");
        userRepository.save(ta);

        Team team = new Team();
        team.setName("Team A");
        team.setSection(1);
        team.setTa(ta);
        teamRepository.save(team);

        List<Team> results = teamRepository.findByTaNetid("ta1");

        assertThat(results).hasSize(1);
        assertThat(results.get(0).getName()).isEqualTo("Team A");
    }
}
