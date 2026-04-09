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
    Optional<User> findByGoogleId(String googleId);
    boolean existsByNetid(String netid);

    List<User> findByRoles_roleName(String roleName);

    @Query("""
        SELECT DISTINCT u FROM User u
        JOIN u.roles r
        WHERE u.initials = :initials
            AND r.roleName IN ('ta', 'hta')
    """)
    List<User> findTaByInitials(
        @Param("initials") String initials);

    @Query("""
        SELECT DISTINCT u FROM User u
        LEFT JOIN u.roles r
        WHERE (:role IS NULL OR r.roleName = :role)
    """)
    Page<User> findUsersWithoutSearch(
            @Param("role") String role,
            Pageable pageable);


    @Query("""
        SELECT DISTINCT u FROM User u
        LEFT JOIN u.roles r
        WHERE (:role IS NULL OR r.roleName = :role)
        AND (
            u.name ILIKE CONCAT('%', :search, '%')
            OR u.netid ILIKE CONCAT('%', :search, '%')
        )
    """)
    Page<User> findUsersWithSearch(
            @Param("role") String role,
            @Param("search") String search,
            Pageable pageable);
}
