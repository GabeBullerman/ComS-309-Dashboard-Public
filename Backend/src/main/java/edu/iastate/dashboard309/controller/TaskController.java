package edu.iastate.dashboard309.controller;

import edu.iastate.dashboard309.dto.TaskRequest;
import edu.iastate.dashboard309.model.Task;
import edu.iastate.dashboard309.model.User;
import edu.iastate.dashboard309.repository.TaskRepository;
import edu.iastate.dashboard309.repository.UserRepository;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/tasks")
public class TaskController {
    private final TaskRepository taskRepository;
    private final UserRepository userRepository;

    public TaskController(TaskRepository taskRepository, UserRepository userRepository) {
        this.taskRepository = taskRepository;
        this.userRepository = userRepository;
    }

    @GetMapping
    public List<Task> list(@RequestParam(required = false) String taNetid) {
        User ta = userRepository.findByNetid(taNetid)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "TA not found"));
        if (taNetid == null || taNetid.isBlank()) {
            return taskRepository.findAll();
        }
        return taskRepository.findByAssignedTo(ta);
    }

    @GetMapping("/{id}")
    public Task get(@PathVariable Long id) {
        return taskRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Task not found"));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Task create(@Valid @RequestBody TaskRequest request) {
        if (!userRepository.existsByNetid(request.taNetid())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "TA does not exist");
        }
        Task task = new Task();
        applyRequest(task, request);
        return taskRepository.save(task);
    }

    @PutMapping("/{id}")
    public Task update(@PathVariable Long id, @Valid @RequestBody TaskRequest request) {
        if (!userRepository.existsByNetid(request.taNetid())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "TA does not exist");
        }
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Task not found"));
        applyRequest(task, request);
        return taskRepository.save(task);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        if (!taskRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Task not found");
        }
        taskRepository.deleteById(id);
    }

    private void applyRequest(Task task, TaskRequest request) {
        User ta = userRepository.findByNetid(request.taNetid())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "TA not found"));
        task.setTitle(request.title());
        task.setDescription(request.description());
        task.setAssignedTo(ta);
    }
}
