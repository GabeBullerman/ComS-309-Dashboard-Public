package edu.iastate.dashboard309.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

import edu.iastate.dashboard309.dto.TaskRequest;
import edu.iastate.dashboard309.model.Task;
import edu.iastate.dashboard309.model.User;
import edu.iastate.dashboard309.repository.TaskRepository;
import edu.iastate.dashboard309.repository.UserRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
class TaskServiceUnitTest {

    @Mock
    private TaskRepository taskRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private TaskService taskService;

    @Test
    void getTaskById_returnsTaskRequest() {
        User assignedTo = new User();
        assignedTo.setNetid("ta1");
        User assignedBy = new User();
        assignedBy.setNetid("ta2");

        Task task = new Task();
        task.setId(1L);
        task.setTitle("Task");
        task.setDescription("Desc");
        task.setDueDate(LocalDateTime.parse("2026-02-18T10:00:00"));
        task.setAssignedTo(assignedTo);
        task.setAssignedBy(assignedBy);

        when(taskRepository.findById(1L)).thenReturn(Optional.of(task));

        TaskRequest result = taskService.getTaskById(1L);

        assertThat(result.title()).isEqualTo("Task");
        assertThat(result.assignedToNetid()).isEqualTo("ta1");
        assertThat(result.assignedByNetid()).isEqualTo("ta2");
    }

    @Test
    void getTaskByAssignedToNetid_returnsTasks() {
        User assignedTo = new User();
        assignedTo.setNetid("ta1");

        User assignedBy = new User();
        assignedBy.setNetid("ta2");

        Task task = new Task();
        task.setId(1L);
        task.setTitle("Task");
        task.setAssignedTo(assignedTo);
        task.setAssignedBy(assignedBy);

        when(userRepository.findByNetid("ta1")).thenReturn(Optional.of(assignedTo));
        when(taskRepository.findByAssignedTo(assignedTo)).thenReturn(List.of(task));
        when(taskRepository.findById(1L)).thenReturn(Optional.of(task));

        List<TaskRequest> results = taskService.getTaskByAssignedToNetid("ta1");

        assertThat(results).hasSize(1);
        assertThat(results.get(0).assignedToNetid()).isEqualTo("ta1");
    }

    @Test
    void getTaskByAssignedToNetid_throwsWhenUserMissing() {
        when(userRepository.findByNetid("missing")).thenReturn(Optional.empty());

        assertThrows(ResponseStatusException.class,
            () -> taskService.getTaskByAssignedToNetid("missing"));
    }
}
