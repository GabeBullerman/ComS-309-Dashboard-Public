package edu.iastate.dashboard309.service;

import static org.assertj.core.api.Assertions.assertThat;

import edu.iastate.dashboard309.model.Permission;
import edu.iastate.dashboard309.model.Role;
import edu.iastate.dashboard309.repository.PermissionRepository;
import edu.iastate.dashboard309.repository.RoleRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

@DataJpaTest
@Import({PermissionService.class, RoleService.class})
@ActiveProfiles("test")
class PermissionServiceTest {

    @Autowired
    private PermissionRepository permissionRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private PermissionService permissionService;

    @Autowired
    private RoleService roleService;

    @Test
    void deletePermission_removesRoleLinkAndDeletesPermission() {
        Role role = new Role();
        role.setRoleName("HEAD_TA");
        roleRepository.save(role);

        Permission permission = new Permission();
        permission.setName("ROLE_ASSIGN");
        permissionRepository.save(permission);

        roleService.addPermissionToRole(role.getId(), "ROLE_ASSIGN");

        permissionService.deletePermission(permission.getId());

        assertThat(permissionRepository.findById(permission.getId())).isEmpty();
        Role updated = roleRepository.findById(role.getId()).orElseThrow();
        assertThat(updated.getPermissions()).isEmpty();
    }
}
