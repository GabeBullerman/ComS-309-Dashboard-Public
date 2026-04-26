package edu.iastate.dashboard309.repository;

import edu.iastate.dashboard309.model.ChatReaction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ChatReactionRepository extends JpaRepository<ChatReaction, Long> {
    Optional<ChatReaction> findByMessage_IdAndEmojiAndUserNetid(Long messageId, String emoji, String userNetid);
}
