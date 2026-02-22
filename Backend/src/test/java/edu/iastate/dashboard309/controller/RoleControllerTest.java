package edu.iastate.dashboard309.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import edu.iastate.dashboard309.dto.RoleRequest;
import edu.iastate.dashboard309.model.Permission;
import edu.iastate.dashboard309.model.Role;
import edu.iastate.dashboard309.repository.PermissionRepository;
import edu.iastate.dashboard309.repository.RoleRepository;
import edu.iastate.dashboard309.service.RoleService;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(RoleController.class)
class RoleControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private RoleRepository roleRepository;

    @MockBean
    private PermissionRepository permissionRepository;

    @MockBean
    private RoleService roleService;

    @Test
    void list_returnsRoles() throws Exception {
        when(roleService.getAllRoles())
            .thenReturn(List.of(new RoleRequest(1L, "TA", List.of("TASK_EDIT"))));

        mockMvc.perform(get("/api/roles"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].roleName").value("TA"));
    }

    @Test
    void create_returnsConflictWhenRoleExists() throws Exception {
        RoleRequest request = new RoleRequest(null, "TA", List.of());
        when(roleRepository.existsByRoleName("TA")).thenReturn(true);

        mockMvc.perform(post("/api/roles")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isConflict());
    }

    @Test
    void addPermission_returnsUpdatedRole() throws Exception {
        Role role = new Role();
        role.setId(1L);
        role.setRoleName("TA");

        Permission permission = new Permission();
        permission.setId(2L);
        permission.setName("TASK_EDIT");

        when(roleRepository.findById(1L)).thenReturn(Optional.of(role));
        when(permissionRepository.findByName("TASK_EDIT")).thenReturn(Optional.of(permission));
        when(roleRepository.save(any(Role.class))).thenReturn(role);
        when(roleService.getRoleById(1L))
            .thenReturn(new RoleRequest(1L, "TA", List.of("TASK_EDIT")));

        mockMvc.perform(put("/api/roles/1/permissions/add/TASK_EDIT"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.permissions[0]").value("TASK_EDIT"));
    }

    @Test
    void create_returnsBadRequestWhenRoleNameMissing() throws Exception {
        RoleRequest request = new RoleRequest(null, "", List.of());

        mockMvc.perform(post("/api/roles")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isBadRequest());
    }
}
