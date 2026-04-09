package edu.iastate.dashboard309.service;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import edu.iastate.dashboard309.dto.DemoPerformanceRequest;
import edu.iastate.dashboard309.model.DemoPerformance;
import edu.iastate.dashboard309.repository.DemoPerformanceRepository;
import edu.iastate.dashboard309.repository.UserRepository;

@Service
public class DemoPerformanceService {
    private final DemoPerformanceRepository demoPerformanceRepository;
    private final UserRepository userRepository;

    public DemoPerformanceService(DemoPerformanceRepository demoPerformanceRepository,
                                  UserRepository userRepository) {
        this.demoPerformanceRepository = demoPerformanceRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public DemoPerformanceRequest getDemoPerformanceById(Long id) {
        DemoPerformance demoPerformance = demoPerformanceRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Demo performance not found"));
        return toRequest(demoPerformance);
    }

    @Transactional
    public List<DemoPerformanceRequest> getAllDemoPerformance() {
        return demoPerformanceRepository.findAll().stream()
            .map(this::toRequest)
            .toList();
    }

    @Transactional
    public List<DemoPerformanceRequest> getDemoPerformanceByStudentNetid(String studentNetid) {
        if (!userRepository.existsByNetid(studentNetid)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found");
        }

        return demoPerformanceRepository.findByStudentNetidOrderByIdDesc(studentNetid).stream()
            .map(this::toRequest)
            .toList();
    }

    @Transactional
    private DemoPerformanceRequest toRequest(DemoPerformance demoPerformance) {
        return new DemoPerformanceRequest(
            demoPerformance.getId(),
            demoPerformance.getStudent().getNetid(),
            demoPerformance.getCodeScore(),
            demoPerformance.getTeamworkScore()
        );
    }
}
