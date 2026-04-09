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

import edu.iastate.dashboard309.dto.DemoPerformanceRequest;
import edu.iastate.dashboard309.model.DemoPerformance;
import edu.iastate.dashboard309.model.User;
import edu.iastate.dashboard309.repository.DemoPerformanceRepository;
import edu.iastate.dashboard309.repository.UserRepository;
import edu.iastate.dashboard309.service.DemoPerformanceService;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/demo-performance")
public class DemoPerformanceController {
    private final DemoPerformanceRepository demoPerformanceRepository;
    private final UserRepository userRepository;
    private final DemoPerformanceService demoPerformanceService;

    public DemoPerformanceController(DemoPerformanceRepository demoPerformanceRepository,
                                     UserRepository userRepository,
                                     DemoPerformanceService demoPerformanceService) {
        this.demoPerformanceRepository = demoPerformanceRepository;
        this.userRepository = userRepository;
        this.demoPerformanceService = demoPerformanceService;
    }

    @GetMapping
    public List<DemoPerformanceRequest> list() {
        return demoPerformanceService.getAllDemoPerformance();
    }

    @GetMapping("/{id}")
    public DemoPerformanceRequest get(@PathVariable Long id) {
        return demoPerformanceService.getDemoPerformanceById(id);
    }

    @GetMapping("/student/{netid}")
    public List<DemoPerformanceRequest> getByStudent(@PathVariable String netid) {
        return demoPerformanceService.getDemoPerformanceByStudentNetid(netid);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public DemoPerformanceRequest create(@Valid @RequestBody DemoPerformanceRequest request) {
        DemoPerformance demoPerformance = new DemoPerformance();
        applyRequest(demoPerformance, request);
        demoPerformanceRepository.save(demoPerformance);
        return demoPerformanceService.getDemoPerformanceById(demoPerformance.getId());
    }

    @PutMapping("/{id}")
    public DemoPerformanceRequest update(@PathVariable Long id,
                                         @Valid @RequestBody DemoPerformanceRequest request) {
        DemoPerformance demoPerformance = demoPerformanceRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Demo performance not found"));
        applyRequest(demoPerformance, request);
        demoPerformanceRepository.save(demoPerformance);
        return demoPerformanceService.getDemoPerformanceById(demoPerformance.getId());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        if (!demoPerformanceRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Demo performance not found");
        }
        demoPerformanceRepository.deleteById(id);
    }

    private void applyRequest(DemoPerformance demoPerformance, DemoPerformanceRequest request) {
        User student = userRepository.findByNetid(request.studentNetid())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Student not found"));

        demoPerformance.setStudent(student);
        demoPerformance.setCodeScore(request.codeScore());
        demoPerformance.setTeamworkScore(request.teamworkScore());
    }
}
