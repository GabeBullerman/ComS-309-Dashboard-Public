package edu.iastate.dashboard309.repository;

import edu.iastate.dashboard309.model.ChatChannel;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChatChannelRepository extends JpaRepository<ChatChannel, String> {}
