package edu.iastate.dashboard309.repository;

import edu.iastate.dashboard309.model.Task;
import edu.iastate.dashboard309.model.User;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface TaskRepository extends JpaRepository<Task, Long> {
    Optional<Task> findById(Long id);
    List<Task> findByAssignedTo(User assignedTo);
    List<Task> findByAssignedBy(User assignedBy);
}
