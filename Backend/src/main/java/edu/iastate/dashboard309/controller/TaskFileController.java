package edu.iastate.dashboard309.controller;

import edu.iastate.dashboard309.dto.TaskFileSummary;
import edu.iastate.dashboard309.model.TaskFile;
import edu.iastate.dashboard309.repository.TaskFileRepository;
import edu.iastate.dashboard309.repository.TaskRepository;
import java.io.IOException;
import java.util.List;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api")
public class TaskFileController {
    private final TaskFileRepository taskFileRepository;
    private final TaskRepository taskRepository;

    public TaskFileController(TaskFileRepository taskFileRepository, TaskRepository taskRepository) {
        this.taskFileRepository = taskFileRepository;
        this.taskRepository = taskRepository;
    }

    @GetMapping("/tasks/{taskId}/files")
    public List<TaskFileSummary> listByTask(@PathVariable Long taskId) {
        if (!taskRepository.existsById(taskId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Task not found");
        }
        return taskFileRepository.findByTaskId(taskId)
                .stream()
                .map(file -> new TaskFileSummary(file.getId(), file.getTaskId()))
                .toList();
    }

    @PostMapping("/tasks/{taskId}/files")
    @ResponseStatus(HttpStatus.CREATED)
    public TaskFileSummary upload(@PathVariable Long taskId, @RequestParam("file") MultipartFile file)
            throws IOException {
        if (!taskRepository.existsById(taskId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Task not found");
        }
        if (file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File is empty");
        }
        TaskFile taskFile = new TaskFile();
        taskFile.setTaskId(taskId);
        taskFile.setData(file.getBytes());
        TaskFile savedFile = taskFileRepository.save(taskFile);
        return new TaskFileSummary(savedFile.getId(), savedFile.getTaskId());
    }

    @GetMapping("/files/{id}")
    public ResponseEntity<byte[]> download(@PathVariable Long id) {
        TaskFile taskFile = taskFileRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "File not found"));
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"file-" + id + "\"")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(taskFile.getData());
    }

    @DeleteMapping("/files/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        if (!taskFileRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "File not found");
        }
        taskFileRepository.deleteById(id);
    }
}
