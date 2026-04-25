package edu.iastate.dashboard309.repository;

import edu.iastate.dashboard309.model.CalendarEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public interface CalendarEventRepository extends JpaRepository<CalendarEvent, Long> {

    List<CalendarEvent> findByNetidAndEventDateBetweenOrderByEventDateAscEventTimeAsc(
            String netid, LocalDate start, LocalDate end);

    // Counts only events that are not completed and (have no time OR time hasn't passed yet)
    @Query("SELECT COUNT(e) FROM CalendarEvent e WHERE e.netid = :netid AND e.eventDate = :date " +
           "AND e.completed = false AND (e.eventTime IS NULL OR e.eventTime >= :now)")
    long countTodayActive(@Param("netid") String netid,
                          @Param("date") LocalDate date,
                          @Param("now") LocalTime now);
}
