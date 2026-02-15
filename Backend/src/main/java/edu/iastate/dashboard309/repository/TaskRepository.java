package edu.iastate.dashboard309.repository;

import edu.iastate.dashboard309.model.Task;
import edu.iastate.dashboard309.model.User;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TaskRepository extends JpaRepository<Task, Long> {
    List<Task> findByAssignedTo(User assignedTo);
}
