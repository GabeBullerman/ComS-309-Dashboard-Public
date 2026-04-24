package edu.iastate.dashboard309.repository;

import edu.iastate.dashboard309.model.CalendarEvent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface CalendarEventRepository extends JpaRepository<CalendarEvent, Long> {

    List<CalendarEvent> findByNetidAndEventDateBetweenOrderByEventDateAscEventTimeAsc(
            String netid, LocalDate start, LocalDate end);

    long countByNetidAndEventDate(String netid, LocalDate date);
}
