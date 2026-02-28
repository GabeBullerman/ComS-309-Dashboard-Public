package edu.iastate.dashboard309.repository;

import edu.iastate.dashboard309.model.Team;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TeamRepository extends JpaRepository<Team, Long> {
    List<Team> findByTaNetid(String taNetid);

    @Query("""
        SELECT t FROM Team t
        LEFT JOIN t.ta ta
        WHERE (:taNetid IS NULL OR ta.netid = :taNetid)
        AND (:section IS NULL OR t.section = :section)
        AND (:status IS NULL OR t.status = :status)
    """)
    Page<Team> findTeams(@Param("taNetid") String taNetid,
                         @Param("section") Integer section,
                         @Param("status") Integer status,
                         Pageable pageable);
}
