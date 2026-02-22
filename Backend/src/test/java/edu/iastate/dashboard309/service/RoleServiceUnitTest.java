package edu.iastate.dashboard309.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

import edu.iastate.dashboard309.dto.RoleRequest;
import edu.iastate.dashboard309.model.Permission;
import edu.iastate.dashboard309.model.Role;
import edu.iastate.dashboard309.repository.PermissionRepository;
import edu.iastate.dashboard309.repository.RoleRepository;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
class RoleServiceUnitTest {

    @Mock
    private RoleRepository roleRepository;

    @Mock
    private PermissionRepository permissionRepository;

    @Mock
    private PermissionService permissionService;

    @InjectMocks
    private RoleService roleService;

    @Test
    void getRoleById_returnsRoleRequest() {
        Role role = new Role();
        role.setId(1L);
        role.setRoleName("TA");

        when(roleRepository.findById(1L)).thenReturn(Optional.of(role));
        when(permissionService.getPermissionNames(role.getPermissions()))
            .thenReturn(List.of("TASK_EDIT"));

        RoleRequest result = roleService.getRoleById(1L);

        assertThat(result.roleName()).isEqualTo("TA");
        assertThat(result.permissions()).containsExactly("TASK_EDIT");
    }

    @Test
    void addPermissionToRole_addsPermission() {
        Role role = new Role();
        role.setId(1L);
        role.setRoleName("TA");

        Permission permission = new Permission();
        permission.setId(2L);
        permission.setName("TASK_EDIT");

        when(roleRepository.findById(1L)).thenReturn(Optional.of(role));
        when(permissionRepository.findByName("TASK_EDIT")).thenReturn(Optional.of(permission));

        roleService.addPermissionToRole(1L, "TASK_EDIT");

        assertThat(role.getPermissions()).contains(permission);
        assertThat(permission.getRoles()).contains(role);
    }

    @Test
    void removePermissionToRole_removesPermission() {
        Role role = new Role();
        role.setId(1L);
        role.setRoleName("TA");

        Permission permission = new Permission();
        permission.setId(2L);
        permission.setName("TASK_EDIT");
        role.addPermission(permission);

        when(roleRepository.findById(1L)).thenReturn(Optional.of(role));
        when(permissionRepository.findByName("TASK_EDIT")).thenReturn(Optional.of(permission));

        roleService.removePermissionToRole(1L, "TASK_EDIT");

        assertThat(role.getPermissions()).isEmpty();
        assertThat(permission.getRoles()).isEmpty();
    }

    @Test
    void addPermissionToRole_throwsWhenRoleMissing() {
        when(roleRepository.findById(1L)).thenReturn(Optional.empty());

        assertThrows(ResponseStatusException.class,
            () -> roleService.addPermissionToRole(1L, "TASK_EDIT"));
    }
}
