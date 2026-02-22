package edu.iastate.dashboard309.service;

import static org.assertj.core.api.Assertions.assertThat;

import edu.iastate.dashboard309.dto.TaskRequest;
import edu.iastate.dashboard309.model.Task;
import edu.iastate.dashboard309.model.User;
import edu.iastate.dashboard309.repository.TaskRepository;
import edu.iastate.dashboard309.repository.UserRepository;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

@DataJpaTest
@Import(TaskService.class)
@ActiveProfiles("test")
class TaskServiceTest {

    @Autowired
    private TaskRepository taskRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TaskService taskService;

    @Test
    void getTaskById_returnsTaskRequest() {
        User assignedTo = new User();
        assignedTo.setName("TA One");
        assignedTo.setNetid("ta1");
        assignedTo.setPassword("pw");
        userRepository.save(assignedTo);

        User assignedBy = new User();
        assignedBy.setName("TA Two");
        assignedBy.setNetid("ta2");
        assignedBy.setPassword("pw");
        userRepository.save(assignedBy);

        Task task = new Task();
        task.setTitle("Task");
        task.setDescription("Desc");
        task.setDueDate(LocalDateTime.parse("2026-02-18T10:00:00"));
        task.setAssignedTo(assignedTo);
        task.setAssignedBy(assignedBy);
        taskRepository.save(task);

        TaskRequest result = taskService.getTaskById(task.getId());

        assertThat(result.title()).isEqualTo("Task");
        assertThat(result.assignedToNetid()).isEqualTo("ta1");
        assertThat(result.assignedByNetid()).isEqualTo("ta2");
    }

    @Test
    void getTaskByAssignedToNetid_returnsTasks() {
        User assignedTo = new User();
        assignedTo.setName("TA One");
        assignedTo.setNetid("ta3");
        assignedTo.setPassword("pw");
        userRepository.save(assignedTo);

        User assignedBy = new User();
        assignedBy.setName("TA Two");
        assignedBy.setNetid("ta4");
        assignedBy.setPassword("pw");
        userRepository.save(assignedBy);

        Task taskOne = new Task();
        taskOne.setTitle("Task One");
        taskOne.setAssignedTo(assignedTo);
        taskOne.setAssignedBy(assignedBy);
        taskRepository.save(taskOne);

        Task taskTwo = new Task();
        taskTwo.setTitle("Task Two");
        taskTwo.setAssignedTo(assignedTo);
        taskTwo.setAssignedBy(assignedBy);
        taskRepository.save(taskTwo);

        List<TaskRequest> results = taskService.getTaskByAssignedToNetid("ta3");

        assertThat(results).hasSize(2);
    }
}
