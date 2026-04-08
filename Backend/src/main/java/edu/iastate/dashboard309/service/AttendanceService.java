package edu.iastate.dashboard309.service;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import edu.iastate.dashboard309.dto.AttendanceRequest;
import edu.iastate.dashboard309.model.Attendance;
import edu.iastate.dashboard309.repository.AttendanceRepository;
import edu.iastate.dashboard309.repository.UserRepository;

@Service
public class AttendanceService {
    private final AttendanceRepository attendanceRepository;
    private final UserRepository userRepository;

    public AttendanceService(AttendanceRepository attendanceRepository, UserRepository userRepository) {
        this.attendanceRepository = attendanceRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public AttendanceRequest getAttendanceById(Long id) {
        Attendance attendance = attendanceRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Attendance not found"));
        return toRequest(attendance);
    }

    @Transactional
    public List<AttendanceRequest> getAllAttendance() {
        return attendanceRepository.findAll().stream()
            .map(this::toRequest)
            .toList();
    }

    @Transactional
    public List<AttendanceRequest> getAttendanceByStudentNetid(String studentNetid) {
        if (!userRepository.existsByNetid(studentNetid)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found");
        }

        return attendanceRepository.findByStudentNetidOrderByAttendanceDateDesc(studentNetid).stream()
            .map(this::toRequest)
            .toList();
    }

    @Transactional
    private AttendanceRequest toRequest(Attendance attendance) {
        return new AttendanceRequest(
            attendance.getId(),
            attendance.getStudent().getNetid(),
            attendance.getAttendanceDate(),
            attendance.getStatus(),
            attendance.getType()
        );
    }
}
