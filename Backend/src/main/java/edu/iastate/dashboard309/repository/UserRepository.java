package edu.iastate.dashboard309.repository;

import edu.iastate.dashboard309.model.User;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByNetid(String netid);
    boolean existsByNetid(String netid);
}
