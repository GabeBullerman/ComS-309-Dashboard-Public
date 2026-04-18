package edu.iastate.dashboard309.repository;

import edu.iastate.dashboard309.model.ChatRead;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ChatReadRepository extends JpaRepository<ChatRead, String> {
    List<ChatRead> findByNetid(String netid);
}
