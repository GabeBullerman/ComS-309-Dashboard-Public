package edu.iastate.dashboard309.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import edu.iastate.dashboard309.model.TaskFile;
import edu.iastate.dashboard309.repository.TaskFileRepository;
import edu.iastate.dashboard309.repository.TaskRepository;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(TaskFileController.class)
class TaskFileControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private TaskFileRepository taskFileRepository;

    @MockBean
    private TaskRepository taskRepository;

    @Test
    void listByTask_returnsNotFoundWhenMissing() throws Exception {
        when(taskRepository.existsById(99L)).thenReturn(false);

        mockMvc.perform(get("/api/tasks/99/files"))
            .andExpect(status().isNotFound());
    }

    @Test
    void upload_returnsBadRequestWhenEmpty() throws Exception {
        when(taskRepository.existsById(1L)).thenReturn(true);
        MockMultipartFile emptyFile = new MockMultipartFile("file", "empty.txt", MediaType.TEXT_PLAIN_VALUE, new byte[0]);

        mockMvc.perform(multipart("/api/tasks/1/files").file(emptyFile))
            .andExpect(status().isBadRequest());
    }

    @Test
    void upload_returnsCreatedSummary() throws Exception {
        when(taskRepository.existsById(1L)).thenReturn(true);

        TaskFile saved = new TaskFile();
        saved.setId(5L);
        saved.setTaskId(1L);
        saved.setData("data".getBytes());

        when(taskFileRepository.save(any(TaskFile.class))).thenReturn(saved);

        MockMultipartFile file = new MockMultipartFile("file", "file.txt", MediaType.TEXT_PLAIN_VALUE, "data".getBytes());

        mockMvc.perform(multipart("/api/tasks/1/files").file(file))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.id").value(5))
            .andExpect(jsonPath("$.taskId").value(1));
    }

    @Test
    void download_returnsFileBytes() throws Exception {
        TaskFile file = new TaskFile();
        file.setId(2L);
        file.setTaskId(1L);
        file.setData("data".getBytes());

        when(taskFileRepository.findById(2L)).thenReturn(Optional.of(file));

        mockMvc.perform(get("/api/files/2"))
            .andExpect(status().isOk());
    }

    @Test
    void delete_returnsNotFoundWhenMissing() throws Exception {
        when(taskFileRepository.existsById(7L)).thenReturn(false);

        mockMvc.perform(delete("/api/files/7"))
            .andExpect(status().isNotFound());
    }

    @Test
    void listByTask_returnsSummaries() throws Exception {
        TaskFile file = new TaskFile();
        file.setId(3L);
        file.setTaskId(1L);
        file.setData("data".getBytes());

        when(taskRepository.existsById(1L)).thenReturn(true);
        when(taskFileRepository.findByTaskId(1L)).thenReturn(List.of(file));

        mockMvc.perform(get("/api/tasks/1/files"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].id").value(3))
            .andExpect(jsonPath("$[0].taskId").value(1));
    }
}
