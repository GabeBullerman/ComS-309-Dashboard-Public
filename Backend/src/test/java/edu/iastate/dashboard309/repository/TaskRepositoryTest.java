package edu.iastate.dashboard309.repository;

import static org.assertj.core.api.Assertions.assertThat;

import edu.iastate.dashboard309.model.Task;
import edu.iastate.dashboard309.model.User;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;

@DataJpaTest
@ActiveProfiles("test")
class TaskRepositoryTest {

    @Autowired
    private TaskRepository taskRepository;

    @Autowired
    private UserRepository userRepository;

    @Test
    void findByAssignedTo_returnsTasks() {
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
        task.setTitle("Task A");
        task.setAssignedTo(assignedTo);
        task.setAssignedBy(assignedBy);
        taskRepository.save(task);

        List<Task> results = taskRepository.findByAssignedTo(assignedTo);

        assertThat(results).hasSize(1);
        assertThat(results.get(0).getTitle()).isEqualTo("Task A");
    }

    @Test
    void findByAssignedBy_returnsTasks() {
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

        Task task = new Task();
        task.setTitle("Task B");
        task.setAssignedTo(assignedTo);
        task.setAssignedBy(assignedBy);
        taskRepository.save(task);

        List<Task> results = taskRepository.findByAssignedBy(assignedBy);

        assertThat(results).hasSize(1);
        assertThat(results.get(0).getTitle()).isEqualTo("Task B");
    }
}
