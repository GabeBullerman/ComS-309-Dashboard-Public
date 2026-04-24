package edu.iastate.dashboard309.repository;

import edu.iastate.dashboard309.model.AppSettings;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface AppSettingsRepository extends JpaRepository<AppSettings, Long> {
    Optional<AppSettings> findByKeyName(String keyName);
}
