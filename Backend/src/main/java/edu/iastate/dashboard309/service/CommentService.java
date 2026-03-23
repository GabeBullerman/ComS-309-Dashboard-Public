package edu.iastate.dashboard309.service;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import edu.iastate.dashboard309.dto.CommentRequest;
import edu.iastate.dashboard309.model.Comment;
import edu.iastate.dashboard309.repository.CommentRepository;
import edu.iastate.dashboard309.repository.TeamRepository;
import edu.iastate.dashboard309.repository.UserRepository;

@Service
public class CommentService {
    private final CommentRepository commentRepository;
    private final TeamRepository teamRepository;
    private final UserRepository userRepository;

    public CommentService(CommentRepository commentRepository,
                          TeamRepository teamRepository,
                          UserRepository userRepository) {
        this.commentRepository = commentRepository;
        this.teamRepository = teamRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public CommentRequest getCommentById(Long id) {
        Comment comment = commentRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Comment not found"));
        return toRequest(comment);
    }

    @Transactional
    public List<CommentRequest> getCommentsByTeamId(Long teamId) {
        if (!teamRepository.existsById(teamId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Team not found");
        }

        return commentRepository.findByTeamIdOrderByCreatedAtDesc(teamId).stream()
            .map(this::toRequest)
            .toList();
    }

    @Transactional
    public List<CommentRequest> getCommentsByTeamAndReceiver(Long teamId, String receiverNetid) {
        if (!teamRepository.existsById(teamId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Team not found");
        }
        if (!userRepository.existsByNetid(receiverNetid)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found");
        }

        return commentRepository.findByTeamIdAndReceiverNetidOrderByCreatedAtDesc(teamId, receiverNetid).stream()
            .map(this::toRequest)
            .toList();
    }

    @Transactional
    private CommentRequest toRequest(Comment comment) {
        return new CommentRequest(
            comment.getId(),
            comment.getCommentBody(),
            comment.getStatus(),
            comment.getReceiver().getNetid(),
            comment.getTeam().getId(),
            comment.getSender().getNetid(),
            comment.getCreatedAt()
        );
    }
}
