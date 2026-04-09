package edu.iastate.dashboard309.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import edu.iastate.dashboard309.model.WeeklyPerformance;

public interface WeeklyPerformanceRepository extends JpaRepository<WeeklyPerformance, Long> {
    List<WeeklyPerformance> findByStudentNetidOrderByIdDesc(String studentNetid);
}
