package edu.iastate.dashboard309.service;

import edu.iastate.dashboard309.model.AppSettings;
import edu.iastate.dashboard309.repository.AppSettingsRepository;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class AppSettingsService {

    private static final String SEMESTER_START_KEY = "semester_start_date";

    private final AppSettingsRepository repo;

    public AppSettingsService(AppSettingsRepository repo) {
        this.repo = repo;
    }

    public Optional<String> getSemesterStartDate() {
        return repo.findByKeyName(SEMESTER_START_KEY)
                .map(AppSettings::getValue);
    }

    public String setSemesterStartDate(String isoDate) {
        AppSettings setting = repo.findByKeyName(SEMESTER_START_KEY)
                .orElseGet(() -> {
                    AppSettings s = new AppSettings();
                    s.setId(1L);
                    s.setKeyName(SEMESTER_START_KEY);
                    return s;
                });
        setting.setValue(isoDate);
        return repo.save(setting).getValue();
    }
}
