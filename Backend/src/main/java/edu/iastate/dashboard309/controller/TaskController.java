package edu.iastate.dashboard309.controller;

import edu.iastate.dashboard309.dto.TaskRequest;
import edu.iastate.dashboard309.model.Task;
import edu.iastate.dashboard309.model.User;
import edu.iastate.dashboard309.repository.TaskRepository;
import edu.iastate.dashboard309.repository.UserRepository;
import edu.iastate.dashboard309.service.TaskService;
import jakarta.validation.Valid;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/tasks")
public class TaskController {
    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final TaskService taskService;

    public TaskController(TaskRepository taskRepository, UserRepository userRepository, TaskService taskService) {
        this.taskRepository = taskRepository;
        this.userRepository = userRepository;
        this.taskService = taskService;
    }

    @GetMapping
    public List<TaskRequest> list(){
        return taskService.getAllTasks();
    }
    
    @GetMapping("/assigned-to/{netid}")
    public List<TaskRequest> getAssignedTo(@PathVariable String netid) {
        return taskService.getTaskByAssignedToNetid(netid);
    }

    @GetMapping("/assigned-by/{netid}")
    public List<TaskRequest> getAssignedBy(@PathVariable String netid) {
        return taskService.getTaskByAssignedByNetid(netid);
    }

    // @PreAuthorize("hasAuthority('SEE_TASKS')")
    @GetMapping("/{id}")
    public TaskRequest get(@PathVariable Long id) {
        taskRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Task not found"));
        return taskService.getTaskById(id);
    }

    // @PreAuthorize("hasAuthority('CREATE_TASKS')")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TaskRequest create(@Valid @RequestBody TaskRequest request) {
        if (!userRepository.existsByNetid(request.assignedToNetid()) || !userRepository.existsByNetid(request.assignedByNetid())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "TA does not exist");
        }
        Task task = new Task();
        applyRequest(task, request);
        taskRepository.save(task);
        return taskService.getTaskById(task.getId());
    }

    @PutMapping("/{id}")
    public TaskRequest update(@PathVariable Long id, @Valid @RequestBody TaskRequest request) {
        if (!userRepository.existsByNetid(request.assignedToNetid()) || !userRepository.existsByNetid(request.assignedByNetid())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "TA does not exist");
        }
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Task not found"));
        applyRequest(task, request);
        taskRepository.save(task);
        return taskService.getTaskById(task.getId());
    }

    // @PreAuthorize("hasAuthority('DELETE_TASKS')")
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        if (!taskRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Task not found");
        }
        taskRepository.deleteById(id);
    }

    private void applyRequest(Task task, TaskRequest request) {
        User assignedTo = userRepository.findByNetid(request.assignedToNetid())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "TA not found"));
        User assignedBy = userRepository.findByNetid(request.assignedByNetid())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "TA not found"));
        task.setTitle(request.title());
        task.setDescription(request.description());
        task.setDueDate(request.dueDate());
        task.setAssignedTo(assignedTo);
        task.setAssignedBy(assignedBy);
    }
}
