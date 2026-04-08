package edu.iastate.dashboard309.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import edu.iastate.dashboard309.model.Attendance;

public interface AttendanceRepository extends JpaRepository<Attendance, Long> {
    List<Attendance> findByStudentNetidOrderByAttendanceDateDesc(String studentNetid);
}
