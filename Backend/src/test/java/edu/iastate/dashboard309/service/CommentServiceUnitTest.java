package edu.iastate.dashboard309.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import edu.iastate.dashboard309.dto.CommentRequest;
import edu.iastate.dashboard309.model.Comment;
import edu.iastate.dashboard309.model.Team;
import edu.iastate.dashboard309.model.User;
import edu.iastate.dashboard309.repository.CommentRepository;
import edu.iastate.dashboard309.repository.TeamRepository;
import edu.iastate.dashboard309.repository.UserRepository;

@ExtendWith(MockitoExtension.class)
class CommentServiceUnitTest {

    @Mock
    private CommentRepository commentRepository;

    @Mock
    private TeamRepository teamRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private CommentService commentService;

    @Test
    void getAllComments_mapsUserAndTeamReceiverFields() {
        Team team = new Team();
        team.setId(10L);

        User sender = new User();
        sender.setNetid("ta1");

        User receiver = new User();
        receiver.setNetid("stud1");

        Comment userComment = new Comment();
        userComment.setId(1L);
        userComment.setCommentBody("User comment");
        userComment.setStatus(1);
        userComment.setSender(sender);
        userComment.setReceiver(receiver);
        userComment.setReceiverTeam(team);
        userComment.setTeam(team);
        userComment.setCreatedAt(LocalDateTime.parse("2026-03-23T10:00:00"));

        Comment teamComment = new Comment();
        teamComment.setId(2L);
        teamComment.setCommentBody("Team comment");
        teamComment.setStatus(2);
        teamComment.setSender(sender);
        teamComment.setReceiver(null);
        teamComment.setReceiverTeam(team);
        teamComment.setTeam(team);
        teamComment.setCreatedAt(LocalDateTime.parse("2026-03-23T11:00:00"));

        when(commentRepository.findAll()).thenReturn(List.of(userComment, teamComment));

        List<CommentRequest> results = commentService.getAllComments();

        assertThat(results).hasSize(2);
        assertThat(results.get(0).receiverNetid()).isEqualTo("stud1");
        assertThat(results.get(0).receiverTeamId()).isEqualTo(10L);
        assertThat(results.get(1).receiverNetid()).isNull();
        assertThat(results.get(1).receiverTeamId()).isEqualTo(10L);
    }

    @Test
    void getCommentById_throwsWhenMissing() {
        when(commentRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(ResponseStatusException.class,
            () -> commentService.getCommentById(999L));
    }

    @Test
    void getCommentsByTeamAndReceiver_throwsWhenTeamMissing() {
        when(teamRepository.existsById(10L)).thenReturn(false);

        assertThrows(ResponseStatusException.class,
            () -> commentService.getCommentsByTeamAndReceiver(10L, "stud1"));
    }

    @Test
    void getCommentsByTeamAndReceiver_throwsWhenUserMissing() {
        when(teamRepository.existsById(10L)).thenReturn(true);
        when(userRepository.existsByNetid("missing")).thenReturn(false);

        assertThrows(ResponseStatusException.class,
            () -> commentService.getCommentsByTeamAndReceiver(10L, "missing"));
    }

    @Test
    void getGeneralCommentsByTeamId_queriesByReceiverTeamId() {
        Team team = new Team();
        team.setId(10L);

        User sender = new User();
        sender.setNetid("ta1");

        Comment teamComment = new Comment();
        teamComment.setId(3L);
        teamComment.setCommentBody("General feedback");
        teamComment.setStatus(0);
        teamComment.setSender(sender);
        teamComment.setReceiver(null);
        teamComment.setReceiverTeam(team);
        teamComment.setTeam(team);
        teamComment.setCreatedAt(LocalDateTime.parse("2026-03-23T12:00:00"));

        when(teamRepository.existsById(10L)).thenReturn(true);
        when(commentRepository.findByTeamIdAndReceiverTeamIdOrderByCreatedAtDesc(10L, 10L))
            .thenReturn(List.of(teamComment));

        List<CommentRequest> results = commentService.getGeneralCommentsByTeamId(10L);

        assertThat(results).hasSize(1);
        assertThat(results.get(0).receiverNetid()).isNull();
        assertThat(results.get(0).receiverTeamId()).isEqualTo(10L);
    }
}
