package edu.iastate.dashboard309.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import edu.iastate.dashboard309.model.RefreshToken;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, UUID> {
    Optional<RefreshToken> findById(UUID id);
    void deleteByUserId(Long userId);
}
