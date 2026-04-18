package edu.iastate.dashboard309.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import edu.iastate.dashboard309.authentication.JwtFilter;
import edu.iastate.dashboard309.dto.TaskRequest;
import edu.iastate.dashboard309.model.Task;
import edu.iastate.dashboard309.model.User;
import edu.iastate.dashboard309.repository.TaskRepository;
import edu.iastate.dashboard309.repository.UserRepository;
import edu.iastate.dashboard309.service.TaskService;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(TaskController.class)
@AutoConfigureMockMvc(addFilters = false)
class TaskControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private TaskRepository taskRepository;

    @MockBean
    private UserRepository userRepository;

    @MockBean
    private TaskService taskService;

    @MockBean
    private JwtFilter jwtFilter;

    @Test
    void list_returnsTasks() throws Exception {
        TaskRequest task = new TaskRequest(1L, "Task", "Desc", null, "ta1", "ta2", null);
        when(taskService.getAllTasks()).thenReturn(List.of(task));

        mockMvc.perform(get("/api/tasks"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].title").value("Task"));
    }

    @Test
    void create_returnsNotFoundWhenTaMissing() throws Exception {
        TaskRequest request = new TaskRequest(null, "Task", "Desc", null, "ta1", "ta2", null);
        when(userRepository.existsByNetid("ta1")).thenReturn(false);

        mockMvc.perform(post("/api/tasks")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isNotFound());
    }

    @Test
    void create_returnsCreatedTask() throws Exception {
        TaskRequest request = new TaskRequest(null, "Task", "Desc", LocalDateTime.parse("2026-02-21T10:00:00"), "ta1", "ta2", null);

        User assignedTo = new User();
        assignedTo.setId(1L);
        assignedTo.setNetid("ta1");
        assignedTo.setName("TA One");
        assignedTo.setPassword("pw");

        User assignedBy = new User();
        assignedBy.setId(2L);
        assignedBy.setNetid("ta2");
        assignedBy.setName("TA Two");
        assignedBy.setPassword("pw");

        when(userRepository.existsByNetid("ta1")).thenReturn(true);
        when(userRepository.existsByNetid("ta2")).thenReturn(true);
        when(userRepository.findByNetid("ta1")).thenReturn(Optional.of(assignedTo));
        when(userRepository.findByNetid("ta2")).thenReturn(Optional.of(assignedBy));
        when(taskRepository.save(any(Task.class))).thenAnswer(invocation -> {
            Task saved = invocation.getArgument(0);
            saved.setId(1L);
            return saved;
        });
        when(taskService.getTaskById(1L))
            .thenReturn(new TaskRequest(1L, "Task", "Desc", request.dueDate(), "ta1", "ta2", null));

        mockMvc.perform(post("/api/tasks")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.id").value(1));
    }

    @Test
    void create_returnsBadRequestWhenTitleMissing() throws Exception {
        TaskRequest request = new TaskRequest(null, "", "Desc", null, "ta1", "ta2", null);

        mockMvc.perform(post("/api/tasks")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isBadRequest());
    }
}
