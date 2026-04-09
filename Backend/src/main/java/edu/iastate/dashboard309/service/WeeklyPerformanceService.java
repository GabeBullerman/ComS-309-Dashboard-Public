package edu.iastate.dashboard309.service;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import edu.iastate.dashboard309.dto.WeeklyPerformanceRequest;
import edu.iastate.dashboard309.model.WeeklyPerformance;
import edu.iastate.dashboard309.repository.UserRepository;
import edu.iastate.dashboard309.repository.WeeklyPerformanceRepository;

@Service
public class WeeklyPerformanceService {
    private final WeeklyPerformanceRepository weeklyPerformanceRepository;
    private final UserRepository userRepository;

    public WeeklyPerformanceService(WeeklyPerformanceRepository weeklyPerformanceRepository,
                                    UserRepository userRepository) {
        this.weeklyPerformanceRepository = weeklyPerformanceRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public WeeklyPerformanceRequest getWeeklyPerformanceById(Long id) {
        WeeklyPerformance weeklyPerformance = weeklyPerformanceRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Weekly performance not found"));
        return toRequest(weeklyPerformance);
    }

    @Transactional
    public List<WeeklyPerformanceRequest> getAllWeeklyPerformance() {
        return weeklyPerformanceRepository.findAll().stream()
            .map(this::toRequest)
            .toList();
    }

    @Transactional
    public List<WeeklyPerformanceRequest> getWeeklyPerformanceByStudentNetid(String studentNetid) {
        if (!userRepository.existsByNetid(studentNetid)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found");
        }

        return weeklyPerformanceRepository.findByStudentNetidOrderByIdDesc(studentNetid).stream()
            .map(this::toRequest)
            .toList();
    }

    @Transactional
    private WeeklyPerformanceRequest toRequest(WeeklyPerformance weeklyPerformance) {
        return new WeeklyPerformanceRequest(
            weeklyPerformance.getId(),
            weeklyPerformance.getStudent().getNetid(),
            weeklyPerformance.getCodeScore(),
            weeklyPerformance.getTeamworkScore()
        );
    }
}
