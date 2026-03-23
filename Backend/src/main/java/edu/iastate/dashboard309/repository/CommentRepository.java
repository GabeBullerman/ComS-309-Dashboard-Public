package edu.iastate.dashboard309.repository;

import edu.iastate.dashboard309.model.Comment;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CommentRepository extends JpaRepository<Comment, Long> {
    List<Comment> findByTeamIdOrderByCreatedAtDesc(Long teamId);

    List<Comment> findByTeamIdAndReceiverNetidOrderByCreatedAtDesc(Long teamId, String receiverNetid);
}
