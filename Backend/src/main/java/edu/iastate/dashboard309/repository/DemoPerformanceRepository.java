package edu.iastate.dashboard309.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import edu.iastate.dashboard309.model.DemoPerformance;

public interface DemoPerformanceRepository extends JpaRepository<DemoPerformance, Long> {
    List<DemoPerformance> findByStudentNetidOrderByIdDesc(String studentNetid);
    Optional<DemoPerformance> findByStudentNetidAndDemoNumber(String studentNetid, Integer demoNumber);
}
