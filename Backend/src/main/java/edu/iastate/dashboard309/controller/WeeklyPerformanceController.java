package edu.iastate.dashboard309.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import edu.iastate.dashboard309.dto.WeeklyPerformanceRequest;
import edu.iastate.dashboard309.model.User;
import edu.iastate.dashboard309.model.WeeklyPerformance;
import edu.iastate.dashboard309.repository.UserRepository;
import edu.iastate.dashboard309.repository.WeeklyPerformanceRepository;
import edu.iastate.dashboard309.service.WeeklyPerformanceService;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/weekly-performance")
public class WeeklyPerformanceController {
    private final WeeklyPerformanceRepository weeklyPerformanceRepository;
    private final UserRepository userRepository;
    private final WeeklyPerformanceService weeklyPerformanceService;

    public WeeklyPerformanceController(WeeklyPerformanceRepository weeklyPerformanceRepository,
                                       UserRepository userRepository,
                                       WeeklyPerformanceService weeklyPerformanceService) {
        this.weeklyPerformanceRepository = weeklyPerformanceRepository;
        this.userRepository = userRepository;
        this.weeklyPerformanceService = weeklyPerformanceService;
    }

    @GetMapping
    public List<WeeklyPerformanceRequest> list() {
        return weeklyPerformanceService.getAllWeeklyPerformance();
    }

    @GetMapping("/{id}")
    public WeeklyPerformanceRequest get(@PathVariable Long id) {
        return weeklyPerformanceService.getWeeklyPerformanceById(id);
    }

    @GetMapping("/student/{netid}")
    public List<WeeklyPerformanceRequest> getByStudent(@PathVariable String netid) {
        return weeklyPerformanceService.getWeeklyPerformanceByStudentNetid(netid);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public WeeklyPerformanceRequest create(@Valid @RequestBody WeeklyPerformanceRequest request) {
        WeeklyPerformance weeklyPerformance = new WeeklyPerformance();
        applyRequest(weeklyPerformance, request);
        weeklyPerformanceRepository.save(weeklyPerformance);
        return weeklyPerformanceService.getWeeklyPerformanceById(weeklyPerformance.getId());
    }

    @PutMapping("/{id}")
    public WeeklyPerformanceRequest update(@PathVariable Long id,
                                           @Valid @RequestBody WeeklyPerformanceRequest request) {
        WeeklyPerformance weeklyPerformance = weeklyPerformanceRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Weekly performance not found"));
        applyRequest(weeklyPerformance, request);
        weeklyPerformanceRepository.save(weeklyPerformance);
        return weeklyPerformanceService.getWeeklyPerformanceById(weeklyPerformance.getId());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        if (!weeklyPerformanceRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Weekly performance not found");
        }
        weeklyPerformanceRepository.deleteById(id);
    }

    private void applyRequest(WeeklyPerformance weeklyPerformance, WeeklyPerformanceRequest request) {
        User student = userRepository.findByNetid(request.studentNetid())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Student not found"));

        weeklyPerformance.setStudent(student);
        weeklyPerformance.setWeekStartDate(request.weekStartDate());
        weeklyPerformance.setCodeScore(request.codeScore());
        weeklyPerformance.setTeamworkScore(request.teamworkScore());
    }
}
