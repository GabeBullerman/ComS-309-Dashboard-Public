package edu.iastate.dashboard309.repository;

import edu.iastate.dashboard309.model.TaskFile;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TaskFileRepository extends JpaRepository<TaskFile, Long> {
    List<TaskFile> findByTaskId(Long taskId);
}
