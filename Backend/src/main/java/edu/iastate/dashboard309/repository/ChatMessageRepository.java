package edu.iastate.dashboard309.repository;

import edu.iastate.dashboard309.model.ChatMessage;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    @Query("SELECT m FROM ChatMessage m ORDER BY m.id DESC")
    List<ChatMessage> findLatest(Pageable pageable);

    @Query("SELECT m FROM ChatMessage m WHERE m.id < :before ORDER BY m.id DESC")
    List<ChatMessage> findBefore(@Param("before") Long before, Pageable pageable);

    long countByIdGreaterThan(Long id);
}
