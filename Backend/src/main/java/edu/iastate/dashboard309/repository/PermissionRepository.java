package edu.iastate.dashboard309.repository;

import edu.iastate.dashboard309.model.Permission;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PermissionRepository extends JpaRepository<Permission, Long> {
    Optional<Permission> findByName(String name);
    boolean existsByName(String name);
}
