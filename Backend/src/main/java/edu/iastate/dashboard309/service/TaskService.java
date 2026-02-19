package edu.iastate.dashboard309.service;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import edu.iastate.dashboard309.dto.TaskRequest;
import edu.iastate.dashboard309.model.Task;
import edu.iastate.dashboard309.model.User;
import edu.iastate.dashboard309.repository.TaskRepository;
import edu.iastate.dashboard309.repository.UserRepository;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class TaskService {

    private final TaskRepository taskRepository;
    private final UserRepository userRepository;

    public TaskService(TaskRepository taskRepository, UserRepository userRepository) {
        this.taskRepository = taskRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public TaskRequest getTaskById(Long id){
        Task task = taskRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Task not found"));
        return new TaskRequest(task.getId(), task.getTitle(), task.getDescription(), task.getDueDate(), task.getAssignedTo().getNetid(), task.getAssignedBy().getNetid());
    }

    @Transactional
    public List<TaskRequest> getAllTasks(){
        List<Task> tasks = taskRepository.findAll();
        return tasks.stream()
            .map(t -> getTaskById(t.getId()))
            .toList();
    }

    @Transactional
    public List<TaskRequest> getTaskByAssignedToNetid(String netid){
        User user = userRepository.findByNetid(netid)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        List<Task> tasks = taskRepository.findByAssignedTo(user);
        return tasks.stream()
            .map(t -> getTaskById(t.getId()))
            .toList();
    }

    @Transactional
    public List<TaskRequest> getTaskByAssignedByNetid(String netid){
        User user = userRepository.findByNetid(netid)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        List<Task> tasks = taskRepository.findByAssignedBy(user);
        return tasks.stream()
            .map(t -> getTaskById(t.getId()))
            .toList();
    }
}
