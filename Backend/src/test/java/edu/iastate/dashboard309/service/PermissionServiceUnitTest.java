package edu.iastate.dashboard309.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import edu.iastate.dashboard309.dto.PermissionRequest;
import edu.iastate.dashboard309.model.Permission;
import edu.iastate.dashboard309.model.Role;
import edu.iastate.dashboard309.repository.PermissionRepository;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class PermissionServiceUnitTest {

    @Mock
    private PermissionRepository permissionRepository;

    @InjectMocks
    private PermissionService permissionService;

    @Test
    void getPermissionById_returnsRequest() {
        Permission permission = new Permission();
        permission.setId(1L);
        permission.setName("TASK_EDIT");

        when(permissionRepository.findById(1L)).thenReturn(Optional.of(permission));

        PermissionRequest result = permissionService.getPermissionById(1L);

        assertThat(result.name()).isEqualTo("TASK_EDIT");
    }

    @Test
    void deletePermission_removesRoleLinks() {
        Permission permission = new Permission();
        permission.setId(1L);
        permission.setName("TASK_EDIT");

        Role role = new Role();
        role.setId(2L);
        role.setRoleName("TA");
        role.addPermission(permission);

        when(permissionRepository.findById(1L)).thenReturn(Optional.of(permission));

        permissionService.deletePermission(1L);

        assertThat(role.getPermissions()).isEmpty();
        verify(permissionRepository).delete(permission);
    }
}
