package edu.iastate.dashboard309.repository;

import edu.iastate.dashboard309.model.Team;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TeamRepository extends JpaRepository<Team, Long> {
    List<Team> findByTaNetid(String taNetid);
}
