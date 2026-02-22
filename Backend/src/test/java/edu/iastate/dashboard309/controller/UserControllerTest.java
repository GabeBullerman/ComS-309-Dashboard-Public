package edu.iastate.dashboard309.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import edu.iastate.dashboard309.dto.UserRequest;
import edu.iastate.dashboard309.model.Role;
import edu.iastate.dashboard309.model.User;
import edu.iastate.dashboard309.repository.RoleRepository;
import edu.iastate.dashboard309.repository.UserRepository;
import edu.iastate.dashboard309.service.UserService;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(UserController.class)
class UserControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private UserRepository userRepository;

    @MockBean
    private RoleRepository roleRepository;

    @MockBean
    private UserService userService;

    @Test
    void list_returnsUsers() throws Exception {
        when(userService.getAllUsers())
            .thenReturn(List.of(new UserRequest(1L, "Alex", "alex1", "pw", "TA")));

        mockMvc.perform(get("/api/users"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].netid").value("alex1"));
    }

    @Test
    void create_returnsConflictWhenNetidExists() throws Exception {
        UserRequest request = new UserRequest(null, "Alex", "alex1", "pw", "TA");
        when(userRepository.existsByNetid("alex1")).thenReturn(true);

        mockMvc.perform(post("/api/users")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isConflict());
    }

    @Test
    void create_returnsCreatedUser() throws Exception {
        UserRequest request = new UserRequest(null, "Alex", "alex1", "pw", "TA");
        Role role = new Role();
        role.setRoleName("TA");

        when(userRepository.existsByNetid("alex1")).thenReturn(false);
        when(roleRepository.findByRoleName("TA")).thenReturn(Optional.of(role));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User saved = invocation.getArgument(0);
            saved.setId(1L);
            return saved;
        });
        when(userService.getUserById(1L))
            .thenReturn(new UserRequest(1L, "Alex", "alex1", "pw", "TA"));

        mockMvc.perform(post("/api/users")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.id").value(1))
            .andExpect(jsonPath("$.role").value("TA"));
    }

    @Test
    void create_returnsBadRequestWhenNameMissing() throws Exception {
        UserRequest request = new UserRequest(null, "", "alex1", "pw", "TA");

        mockMvc.perform(post("/api/users")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isBadRequest());
    }
}
