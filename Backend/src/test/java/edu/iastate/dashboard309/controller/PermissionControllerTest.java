package edu.iastate.dashboard309.controller;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import edu.iastate.dashboard309.dto.PermissionRequest;
import edu.iastate.dashboard309.repository.PermissionRepository;
import edu.iastate.dashboard309.service.PermissionService;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(PermissionController.class)
class PermissionControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private PermissionRepository permissionRepository;

    @MockBean
    private PermissionService permissionService;

    @Test
    void list_returnsPermissions() throws Exception {
        when(permissionService.getAllPermissions())
            .thenReturn(List.of(new PermissionRequest(1L, "TASK_EDIT")));

        mockMvc.perform(get("/api/permissions"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].name").value("TASK_EDIT"));
    }

    @Test
    void create_returnsConflictWhenPermissionExists() throws Exception {
        PermissionRequest request = new PermissionRequest(null, "TASK_EDIT");
        when(permissionRepository.existsByName("TASK_EDIT")).thenReturn(true);

        mockMvc.perform(post("/api/permissions")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isConflict());
    }

    @Test
    void delete_returnsNotFoundWhenMissing() throws Exception {
        when(permissionRepository.existsById(99L)).thenReturn(false);

        mockMvc.perform(delete("/api/permissions/99"))
            .andExpect(status().isNotFound());
    }
}
