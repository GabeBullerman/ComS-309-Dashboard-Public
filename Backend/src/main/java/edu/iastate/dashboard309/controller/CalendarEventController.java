package edu.iastate.dashboard309.controller;

import edu.iastate.dashboard309.dto.CalendarEventCreateRequest;
import edu.iastate.dashboard309.dto.CalendarEventDto;
import edu.iastate.dashboard309.model.CalendarEvent;
import edu.iastate.dashboard309.repository.CalendarEventRepository;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/calendar")
public class CalendarEventController {

    private final CalendarEventRepository repo;

    public CalendarEventController(CalendarEventRepository repo) {
        this.repo = repo;
    }

    @GetMapping("/events")
    public List<CalendarEventDto> list(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate end,
            Authentication auth) {
        return repo.findByNetidAndEventDateBetweenOrderByEventDateAscEventTimeAsc(auth.getName(), start, end)
                .stream().map(this::toDto).toList();
    }

    @GetMapping("/events/today-count")
    public Map<String, Long> todayCount(Authentication auth) {
        long count = repo.countByNetidAndEventDate(auth.getName(), LocalDate.now());
        return Map.of("count", count);
    }

    @PostMapping("/events")
    @ResponseStatus(HttpStatus.CREATED)
    public CalendarEventDto create(@Valid @RequestBody CalendarEventCreateRequest req, Authentication auth) {
        CalendarEvent event = new CalendarEvent();
        event.setTitle(req.title().trim());
        event.setDescription(req.description());
        event.setEventDate(req.eventDate());
        event.setEventTime(req.eventTime());
        event.setNetid(auth.getName());
        event.setEventType(req.eventType() != null && !req.eventType().isBlank() ? req.eventType() : "PERSONAL");
        return toDto(repo.save(event));
    }

    @PutMapping("/events/{id}")
    public CalendarEventDto update(@PathVariable Long id,
                                   @Valid @RequestBody CalendarEventCreateRequest req,
                                   Authentication auth) {
        CalendarEvent event = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Event not found"));
        if (!event.getNetid().equals(auth.getName())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not your event");
        }
        event.setTitle(req.title().trim());
        event.setDescription(req.description());
        event.setEventDate(req.eventDate());
        event.setEventTime(req.eventTime());
        if (req.eventType() != null && !req.eventType().isBlank()) {
            event.setEventType(req.eventType());
        }
        return toDto(repo.save(event));
    }

    @DeleteMapping("/events/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id, Authentication auth) {
        CalendarEvent event = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Event not found"));
        if (!event.getNetid().equals(auth.getName())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not your event");
        }
        repo.deleteById(id);
    }

    @PatchMapping("/events/{id}/complete")
    public CalendarEventDto toggleComplete(@PathVariable Long id, Authentication auth) {
        CalendarEvent event = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Event not found"));
        if (!event.getNetid().equals(auth.getName())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not your event");
        }
        event.setCompleted(!event.isCompleted());
        return toDto(repo.save(event));
    }

    private CalendarEventDto toDto(CalendarEvent e) {
        return new CalendarEventDto(
                e.getId(), e.getTitle(), e.getDescription(),
                e.getEventDate(), e.getEventTime(), e.getNetid(),
                e.getEventType(), e.isCompleted(), e.getCreatedAt());
    }
}
