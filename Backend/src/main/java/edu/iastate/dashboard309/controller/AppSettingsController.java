package edu.iastate.dashboard309.controller;

import edu.iastate.dashboard309.service.AppSettingsService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/settings")
public class AppSettingsController {

    private final AppSettingsService service;

    public AppSettingsController(AppSettingsService service) {
        this.service = service;
    }

    @GetMapping("/semester-start")
    public ResponseEntity<Map<String, String>> getSemesterStart() {
        String value = service.getSemesterStartDate().orElse(null);
        return ResponseEntity.ok(Map.of("semesterStartDate", value != null ? value : ""));
    }

    @PreAuthorize("hasAnyAuthority('Instructor', 'HTA')")
    @PutMapping("/semester-start")
    public ResponseEntity<Map<String, String>> setSemesterStart(@RequestBody Map<String, String> body) {
        String date = body.get("semesterStartDate");
        if (date == null || date.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        String saved = service.setSemesterStartDate(date.trim());
        return ResponseEntity.ok(Map.of("semesterStartDate", saved));
    }
}
