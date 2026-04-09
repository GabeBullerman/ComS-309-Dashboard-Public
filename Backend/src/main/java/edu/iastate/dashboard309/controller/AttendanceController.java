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

import edu.iastate.dashboard309.dto.AttendanceRequest;
import edu.iastate.dashboard309.model.Attendance;
import edu.iastate.dashboard309.model.User;
import edu.iastate.dashboard309.repository.AttendanceRepository;
import edu.iastate.dashboard309.repository.UserRepository;
import edu.iastate.dashboard309.service.AttendanceService;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/attendance")
public class AttendanceController {
    private final AttendanceRepository attendanceRepository;
    private final UserRepository userRepository;
    private final AttendanceService attendanceService;

    public AttendanceController(AttendanceRepository attendanceRepository,
                                UserRepository userRepository,
                                AttendanceService attendanceService) {
        this.attendanceRepository = attendanceRepository;
        this.userRepository = userRepository;
        this.attendanceService = attendanceService;
    }

    @GetMapping
    public List<AttendanceRequest> list() {
        return attendanceService.getAllAttendance();
    }

    @GetMapping("/{id}")
    public AttendanceRequest get(@PathVariable Long id) {
        return attendanceService.getAttendanceById(id);
    }

    @GetMapping("/student/{netid}")
    public List<AttendanceRequest> getByStudent(@PathVariable String netid) {
        return attendanceService.getAttendanceByStudentNetid(netid);
    }

    @GetMapping("/count/student/{netid}")
    public Long getPresentCountByStudent(@PathVariable String netid) {
        return attendanceService.getPresentAttendanceCountByStudentNetid(netid);
    }

    @GetMapping("/count/student/{netid}/absent")
    public Long getAbsentCountByStudent(@PathVariable String netid) {
        return attendanceService.getAbsentAttendanceCountByStudentNetid(netid);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public AttendanceRequest create(@Valid @RequestBody AttendanceRequest request) {
        Attendance attendance = new Attendance();
        applyRequest(attendance, request);
        attendanceRepository.save(attendance);
        return attendanceService.getAttendanceById(attendance.getId());
    }

    @PutMapping("/{id}")
    public AttendanceRequest update(@PathVariable Long id, @Valid @RequestBody AttendanceRequest request) {
        Attendance attendance = attendanceRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Attendance not found"));
        applyRequest(attendance, request);
        attendanceRepository.save(attendance);
        return attendanceService.getAttendanceById(attendance.getId());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        if (!attendanceRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Attendance not found");
        }
        attendanceRepository.deleteById(id);
    }

    private void applyRequest(Attendance attendance, AttendanceRequest request) {
        User student = userRepository.findByNetid(request.studentNetid())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Student not found"));

        attendance.setStudent(student);
        attendance.setAttendanceDate(request.attendanceDate());
        attendance.setStatus(request.status());
        attendance.setType(request.type());
    }
}
