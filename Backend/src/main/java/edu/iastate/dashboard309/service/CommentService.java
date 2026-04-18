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
    public List<CommentRequest> getAllComments() {
        return commentRepository.findAll().stream()
            .map(this::toRequest)
            .toList();
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
    public CommentRequest updateComment(Long id, String callerNetid, boolean isElevated,
                                        String newBody, Integer newStatus, boolean newIsPrivate) {
        Comment comment = commentRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Comment not found"));
        if (!comment.getSender().getNetid().equals(callerNetid) && !isElevated) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the author can edit this comment");
        }
        comment.setCommentBody(newBody);
        comment.setStatus(newStatus);
        comment.setPrivate(newIsPrivate);
        commentRepository.save(comment);
        return toRequest(comment);
    }

    @Transactional
    public void deleteComment(Long id, String callerNetid, boolean isElevated) {
        Comment comment = commentRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Comment not found"));
        if (!comment.getSender().getNetid().equals(callerNetid) && !isElevated) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the author can delete this comment");
        }
        commentRepository.delete(comment);
    }

    @Transactional
    public List<CommentRequest> getGeneralCommentsByTeamId(Long teamId) {
        if (!teamRepository.existsById(teamId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Team not found");
        }

        return commentRepository.findByTeamIdAndReceiverTeamIdOrderByCreatedAtDesc(teamId, teamId).stream()
            .map(this::toRequest)
            .toList();
    }

    @Transactional
    private CommentRequest toRequest(Comment comment) {
        String receiverNetid = null;
        Long receiverTeamId = null;

        if (comment.getReceiver() != null) {
            receiverNetid = comment.getReceiver().getNetid();
        }
        if (comment.getReceiverTeam() != null) {
            receiverTeamId = comment.getReceiverTeam().getId();
        }

        return new CommentRequest(
            comment.getId(),
            comment.getCommentBody(),
            comment.getStatus(),
            receiverNetid,
            receiverTeamId,
            comment.getTeam().getId(),
            comment.getSender().getNetid(),
            comment.getCreatedAt(),
            comment.isPrivate()
        );
    }
}
