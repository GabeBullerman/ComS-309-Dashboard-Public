package edu.iastate.dashboard309.repository;

import edu.iastate.dashboard309.model.ChatMention;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChatMentionRepository extends JpaRepository<ChatMention, Long> {}
