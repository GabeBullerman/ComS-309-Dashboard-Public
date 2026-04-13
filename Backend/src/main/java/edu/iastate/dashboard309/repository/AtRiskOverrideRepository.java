package edu.iastate.dashboard309.repository;

import edu.iastate.dashboard309.model.AtRiskOverride;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AtRiskOverrideRepository extends JpaRepository<AtRiskOverride, Long> {
    List<AtRiskOverride> findByStudentNetid(String studentNetid);
    boolean existsByStudentNetid(String studentNetid);
    void deleteByStudentNetid(String studentNetid);
}
