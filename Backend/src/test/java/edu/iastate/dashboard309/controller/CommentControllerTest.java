package edu.iastate.dashboard309.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import com.fasterxml.jackson.databind.ObjectMapper;

import edu.iastate.dashboard309.authentication.JwtFilter;
import edu.iastate.dashboard309.dto.CommentRequest;
import edu.iastate.dashboard309.dto.TeamCommentCreateRequest;
import edu.iastate.dashboard309.model.Comment;
import edu.iastate.dashboard309.model.Team;
import edu.iastate.dashboard309.model.User;
import edu.iastate.dashboard309.repository.CommentRepository;
import edu.iastate.dashboard309.repository.TeamRepository;
import edu.iastate.dashboard309.repository.UserRepository;
import edu.iastate.dashboard309.service.CommentService;

@WebMvcTest(CommentController.class)
@AutoConfigureMockMvc(addFilters = false)
class CommentControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private CommentRepository commentRepository;

    @MockBean
    private TeamRepository teamRepository;

    @MockBean
    private UserRepository userRepository;

    @MockBean
    private CommentService commentService;

    @MockBean
    private JwtFilter jwtFilter;

    @Test
    void listAll_returnsComments() throws Exception {
        CommentRequest response = new CommentRequest(
            3L,
            "Overall team momentum is strong",
            2,
            null,
            10L,
            10L,
            "ta1",
            LocalDateTime.parse("2026-03-23T12:00:00")
        );

        when(commentService.getAllComments()).thenReturn(List.of(response));

        mockMvc.perform(get("/api/comments"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].id").value(3))
            .andExpect(jsonPath("$[0].commentBody").value("Overall team momentum is strong"));
    }

    @Test
    void listByTeam_returnsComments() throws Exception {
        CommentRequest response = new CommentRequest(
            1L,
            "Needs to contribute more",
            0,
            "stud1",
            null,
            10L,
            "ta1",
            LocalDateTime.parse("2026-03-23T10:00:00")
        );

        when(commentService.getCommentsByTeamId(10L)).thenReturn(List.of(response));

        mockMvc.perform(get("/api/comments/team/10"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].commentBody").value("Needs to contribute more"));
    }

    @Test
    void listGeneralByTeam_returnsComments() throws Exception {
        CommentRequest response = new CommentRequest(
            2L,
            "Team needs better coordination",
            1,
            null,
            10L,
            10L,
            "ta1",
            LocalDateTime.parse("2026-03-23T11:00:00")
        );

        when(commentService.getGeneralCommentsByTeamId(10L)).thenReturn(List.of(response));

        mockMvc.perform(get("/api/comments/team/10/general"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].commentBody").value("Team needs better coordination"));
    }

    @Test
    void get_returnsNotFoundWhenCommentMissing() throws Exception {
        when(commentService.getCommentById(999L))
            .thenThrow(new ResponseStatusException(HttpStatus.NOT_FOUND, "Comment not found"));

        mockMvc.perform(get("/api/comments/999"))
            .andExpect(status().isNotFound());
    }

    @Test
    void listByTeam_returnsNotFoundWhenTeamMissing() throws Exception {
        when(commentService.getCommentsByTeamId(999L))
            .thenThrow(new ResponseStatusException(HttpStatus.NOT_FOUND, "Team not found"));

        mockMvc.perform(get("/api/comments/team/999"))
            .andExpect(status().isNotFound());
    }

    @Test
    void create_returnsForbiddenWhenSenderIsNotTeamTa() throws Exception {
        CommentRequest request = new CommentRequest(
            null,
            "Progress is moderate",
            1,
            "stud1",
            null,
            10L,
            null,
            null
        );

        User sender = new User();
        sender.setId(99L);
        sender.setNetid("ta2");
        sender.setName("TA Two");
        sender.setPassword("pw");

        User receiver = new User();
        receiver.setId(2L);
        receiver.setNetid("stud1");
        receiver.setName("Student One");
        receiver.setPassword("pw");

        Team team = new Team();
        team.setId(10L);
        team.setName("Team 10");

        User teamTa = new User();
        teamTa.setId(1L);
        teamTa.setNetid("ta1");
        teamTa.setName("TA One");
        teamTa.setPassword("pw");
        team.setTa(teamTa);

        receiver.setTeam(team);

        when(userRepository.findByNetid("ta2")).thenReturn(Optional.of(sender));
        when(userRepository.findByNetid("stud1")).thenReturn(Optional.of(receiver));
        when(teamRepository.findById(10L)).thenReturn(Optional.of(team));

        Authentication auth = new UsernamePasswordAuthenticationToken("ta2", "pw");

        mockMvc.perform(post("/api/comments")
            .principal(auth)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isForbidden());
    }

    @Test
    void create_returnsCreatedComment() throws Exception {
        CommentRequest request = new CommentRequest(
            null,
            "Great improvement this week",
            2,
            "stud1",
            null,
            10L,
            null,
            null
        );

        User sender = new User();
        sender.setId(1L);
        sender.setNetid("ta1");
        sender.setName("TA One");
        sender.setPassword("pw");

        User receiver = new User();
        receiver.setId(2L);
        receiver.setNetid("stud1");
        receiver.setName("Student One");
        receiver.setPassword("pw");

        Team team = new Team();
        team.setId(10L);
        team.setName("Team 10");
        team.setTa(sender);
        receiver.setTeam(team);

        when(userRepository.findByNetid("ta1")).thenReturn(Optional.of(sender));
        when(userRepository.findByNetid("stud1")).thenReturn(Optional.of(receiver));
        when(teamRepository.findById(10L)).thenReturn(Optional.of(team));
        when(commentRepository.save(any(Comment.class))).thenAnswer(invocation -> {
            Comment saved = invocation.getArgument(0);
            saved.setId(25L);
            return saved;
        });

        when(commentService.getCommentById(25L)).thenReturn(new CommentRequest(
            25L,
            "Great improvement this week",
            2,
            "stud1",
            null,
            10L,
            "ta1",
            LocalDateTime.parse("2026-03-23T13:00:00")
        ));

        Authentication auth = new UsernamePasswordAuthenticationToken("ta1", "pw");

        mockMvc.perform(post("/api/comments")
            .principal(auth)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.id").value(25))
            .andExpect(jsonPath("$.senderNetid").value("ta1"));
    }

    @Test
    void create_returnsBadRequestWhenStatusOutOfRange() throws Exception {
        CommentRequest request = new CommentRequest(
            null,
            "Invalid status comment",
            3,
            "stud1",
            null,
            10L,
            null,
            null
        );

        Authentication auth = new UsernamePasswordAuthenticationToken("ta1", "pw");

        mockMvc.perform(post("/api/comments")
                .principal(auth)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isBadRequest());
    }

    @Test
    void create_returnsNotFoundWhenReceiverMissing() throws Exception {
        CommentRequest request = new CommentRequest(
            null,
            "Missing receiver",
            1,
            "missing",
            null,
            10L,
            null,
            null
        );

        User sender = new User();
        sender.setId(1L);
        sender.setNetid("ta1");
        sender.setName("TA One");
        sender.setPassword("pw");

        when(userRepository.findByNetid("ta1")).thenReturn(Optional.of(sender));
        when(userRepository.findByNetid("missing")).thenReturn(Optional.empty());

        Authentication auth = new UsernamePasswordAuthenticationToken("ta1", "pw");

        mockMvc.perform(post("/api/comments")
                .principal(auth)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isNotFound());
    }

    @Test
    void create_returnsNotFoundWhenTeamMissing() throws Exception {
        CommentRequest request = new CommentRequest(
            null,
            "Missing team",
            1,
            "stud1",
            null,
            999L,
            null,
            null
        );

        User sender = new User();
        sender.setId(1L);
        sender.setNetid("ta1");
        sender.setName("TA One");
        sender.setPassword("pw");

        User receiver = new User();
        receiver.setId(2L);
        receiver.setNetid("stud1");
        receiver.setName("Student One");
        receiver.setPassword("pw");

        when(userRepository.findByNetid("ta1")).thenReturn(Optional.of(sender));
        when(userRepository.findByNetid("stud1")).thenReturn(Optional.of(receiver));
        when(teamRepository.findById(999L)).thenReturn(Optional.empty());

        Authentication auth = new UsernamePasswordAuthenticationToken("ta1", "pw");

        mockMvc.perform(post("/api/comments")
                .principal(auth)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isNotFound());
    }

    @Test
    void create_returnsBadRequestWhenReceiverIsInDifferentTeam() throws Exception {
        CommentRequest request = new CommentRequest(
            null,
            "Wrong team receiver",
            1,
            "stud1",
            null,
            10L,
            null,
            null
        );

        User sender = new User();
        sender.setId(1L);
        sender.setNetid("ta1");
        sender.setName("TA One");
        sender.setPassword("pw");

        Team requestTeam = new Team();
        requestTeam.setId(10L);
        requestTeam.setTa(sender);

        Team differentTeam = new Team();
        differentTeam.setId(11L);

        User receiver = new User();
        receiver.setId(2L);
        receiver.setNetid("stud1");
        receiver.setName("Student One");
        receiver.setPassword("pw");
        receiver.setTeam(differentTeam);

        when(userRepository.findByNetid("ta1")).thenReturn(Optional.of(sender));
        when(userRepository.findByNetid("stud1")).thenReturn(Optional.of(receiver));
        when(teamRepository.findById(10L)).thenReturn(Optional.of(requestTeam));

        Authentication auth = new UsernamePasswordAuthenticationToken("ta1", "pw");

        mockMvc.perform(post("/api/comments")
                .principal(auth)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isBadRequest());
    }

    @Test
    void createGeneralComment_returnsCreatedAndUpdatesTaNotes() throws Exception {
        TeamCommentCreateRequest request = new TeamCommentCreateRequest(
            "Team is progressing steadily",
            2
        );

        User sender = new User();
        sender.setId(1L);
        sender.setNetid("ta1");
        sender.setName("TA One");
        sender.setPassword("pw");

        Team team = new Team();
        team.setId(10L);
        team.setName("Team 10");
        team.setTa(sender);

        when(userRepository.findByNetid("ta1")).thenReturn(Optional.of(sender));
        when(teamRepository.findById(10L)).thenReturn(Optional.of(team));
        when(commentRepository.save(any(Comment.class))).thenAnswer(invocation -> {
            Comment saved = invocation.getArgument(0);
            saved.setId(30L);
            return saved;
        });
        when(commentService.getCommentById(30L)).thenReturn(new CommentRequest(
            30L,
            "Team is progressing steadily",
            2,
            null,
            10L,
            10L,
            "ta1",
            LocalDateTime.parse("2026-03-23T14:00:00")
        ));

        Authentication auth = new UsernamePasswordAuthenticationToken("ta1", "pw");

        mockMvc.perform(post("/api/comments/team/10/general")
                .principal(auth)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.id").value(30));

        verify(teamRepository).save(argThat(savedTeam ->
            savedTeam.getId().equals(10L)
                && "Team is progressing steadily".equals(savedTeam.getTaNotes())));
    }

    @Test
    void createGeneralComment_returnsForbiddenWhenSenderIsNotTeamTa() throws Exception {
        TeamCommentCreateRequest request = new TeamCommentCreateRequest(
            "General note",
            1
        );

        User sender = new User();
        sender.setId(99L);
        sender.setNetid("ta2");
        sender.setName("TA Two");
        sender.setPassword("pw");

        User teamTa = new User();
        teamTa.setId(1L);
        teamTa.setNetid("ta1");
        teamTa.setName("TA One");
        teamTa.setPassword("pw");

        Team team = new Team();
        team.setId(10L);
        team.setTa(teamTa);

        when(userRepository.findByNetid("ta2")).thenReturn(Optional.of(sender));
        when(teamRepository.findById(10L)).thenReturn(Optional.of(team));

        Authentication auth = new UsernamePasswordAuthenticationToken("ta2", "pw");

        mockMvc.perform(post("/api/comments/team/10/general")
                .principal(auth)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isForbidden());
    }
}
