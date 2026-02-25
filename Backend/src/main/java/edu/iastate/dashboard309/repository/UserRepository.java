package edu.iastate.dashboard309.repository;

import edu.iastate.dashboard309.model.User;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByNetid(String netid);
    boolean existsByNetid(String netid);

    List<User> findByRoles_roleName(String roleName);

    @Query("""
        SELECT DISTINCT u FROM User u
        LEFT JOIN u.roles r
        WHERE (:role IS NULL OR r.roleName = :role)
        AND (
            :search IS NULL
            OR LOWER(u.name) LIKE LOWER(CONCAT('%', :search, '%'))
            OR LOWER(u.netid) LIKE LOWER(CONCAT('%', :search, '%'))
        )
    """)
    Page<User> findUsers(@Param("role") String role, @Param("search") String search, Pageable pageable);
}
