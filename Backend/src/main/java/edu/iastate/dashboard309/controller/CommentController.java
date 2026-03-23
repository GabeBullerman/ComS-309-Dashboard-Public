package edu.iastate.dashboard309.controller;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import edu.iastate.dashboard309.dto.CommentRequest;
import edu.iastate.dashboard309.model.Comment;
import edu.iastate.dashboard309.model.Team;
import edu.iastate.dashboard309.model.User;
import edu.iastate.dashboard309.repository.CommentRepository;
import edu.iastate.dashboard309.repository.TeamRepository;
import edu.iastate.dashboard309.repository.UserRepository;
import edu.iastate.dashboard309.service.CommentService;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/comments")
public class CommentController {
    private final CommentRepository commentRepository;
    private final TeamRepository teamRepository;
    private final UserRepository userRepository;
    private final CommentService commentService;

    public CommentController(CommentRepository commentRepository,
                             TeamRepository teamRepository,
                             UserRepository userRepository,
                             CommentService commentService) {
        this.commentRepository = commentRepository;
        this.teamRepository = teamRepository;
        this.userRepository = userRepository;
        this.commentService = commentService;
    }

    @GetMapping("/team/{teamId}")
    public List<CommentRequest> listByTeam(@PathVariable Long teamId) {
        return commentService.getCommentsByTeamId(teamId);
    }

    @GetMapping("/team/{teamId}/user/{receiverNetid}")
    public List<CommentRequest> listByTeamAndReceiver(@PathVariable Long teamId,
                                                      @PathVariable String receiverNetid) {
        return commentService.getCommentsByTeamAndReceiver(teamId, receiverNetid);
    }

    @GetMapping("/{id}")
    public CommentRequest get(@PathVariable Long id) {
        return commentService.getCommentById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CommentRequest create(@Valid @RequestBody CommentRequest request, Authentication authentication) {
        User sender = userRepository.findByNetid(authentication.getName())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Sender not found"));

        User receiver = userRepository.findByNetid(request.receiverNetid())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Receiver not found"));

        Team team = teamRepository.findById(request.teamId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Team not found"));

        if (team.getTa() == null || !team.getTa().getId().equals(sender.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the team TA can create comments");
        }

        if (receiver.getTeam() == null || !receiver.getTeam().getId().equals(team.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Receiver is not in the specified team");
        }

        Comment comment = new Comment();
        comment.setCommentBody(request.commentBody());
        comment.setStatus(request.status());
        comment.setSender(sender);
        comment.setReceiver(receiver);
        comment.setTeam(team);
        comment.setCreatedAt(LocalDateTime.now());
        commentRepository.save(comment);

        return commentService.getCommentById(comment.getId());
    }
}
