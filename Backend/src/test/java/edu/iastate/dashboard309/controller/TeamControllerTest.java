package edu.iastate.dashboard309.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import edu.iastate.dashboard309.authentication.JwtFilter;
import edu.iastate.dashboard309.dto.TeamRequest;
import edu.iastate.dashboard309.dto.UserRequest;
import edu.iastate.dashboard309.model.Team;
import edu.iastate.dashboard309.model.User;
import edu.iastate.dashboard309.repository.TeamRepository;
import edu.iastate.dashboard309.repository.UserRepository;
import edu.iastate.dashboard309.service.TeamService;
import edu.iastate.dashboard309.service.UserService;

import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(TeamController.class)
@AutoConfigureMockMvc(addFilters = false)
class TeamControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private TeamRepository teamRepository;

    @MockBean
    private UserRepository userRepository;

    @MockBean 
    private UserService userService;

    @MockBean
    private TeamService teamService;

    @MockBean
    private JwtFilter jwtFilter;

    @Test
    void list_withoutTaNetid_returnsAllTeams() throws Exception {
        TeamRequest team = new TeamRequest(1L, "Team A", 1, "ta1", List.of(), 0, "notes", "gitlab", null);
        when(teamService.getTeams(any(), any(), any(), any(Pageable.class)))
            .thenReturn(new PageImpl<>(List.of(team)));

        mockMvc.perform(get("/api/teams"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content[0].name").value("Team A"));
    }

    @Test
    void list_withTaNetid_returnsFilteredTeams() throws Exception {
        TeamRequest team = new TeamRequest(2L, "Team B", 2, "ta2", List.of(), 0, "notes", "gitlab", null);
        when(teamService.getTeams(any(), any(), any(), any(Pageable.class)))
            .thenReturn(new PageImpl<>(List.of(team)));

        mockMvc.perform(get("/api/teams").param("taNetid", "ta2"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content[0].taNetid").value("ta2"));
    }

    @Test
    void create_returnsBadRequestWhenTaMissing() throws Exception {
        TeamRequest request = new TeamRequest(null, "Team A", 1, "ta1", List.of(), 0, "notes", "gitlab", null);
        when(userRepository.existsByNetid("ta1")).thenReturn(false);

        mockMvc.perform(post("/api/teams")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isBadRequest());
    }

    @Test
    void create_returnsCreatedTeam() throws Exception {
        TeamRequest request = new TeamRequest(null, "Team A", 1, "ta1", List.of(), 0, "notes", "gitlab", null);

        User ta = new User();
        ta.setId(10L);
        ta.setNetid("ta1");
        ta.setName("TA One");
        ta.setPassword("pw");

        when(userRepository.existsByNetid("ta1")).thenReturn(true);
        when(userRepository.findByNetid("ta1")).thenReturn(Optional.of(ta));
        when(teamRepository.save(any(Team.class))).thenAnswer(invocation -> {
            Team saved = invocation.getArgument(0);
            saved.setId(1L);
            return saved;
        });
        when(teamService.getTeamById(1L))
            .thenReturn(new TeamRequest(1L, "Team A", 1, "ta1", List.of(), 0, "notes", "gitlab", null));

        mockMvc.perform(post("/api/teams")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.id").value(1));
    }
}
