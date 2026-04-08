package edu.iastate.dashboard309.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import edu.iastate.dashboard309.model.Attendance;
import edu.iastate.dashboard309.model.AttendanceStatus;

public interface AttendanceRepository extends JpaRepository<Attendance, Long> {
    List<Attendance> findByStudentNetidOrderByAttendanceDateDesc(String studentNetid);

    long countByStudentNetidAndStatus(String studentNetid, AttendanceStatus status);
}
