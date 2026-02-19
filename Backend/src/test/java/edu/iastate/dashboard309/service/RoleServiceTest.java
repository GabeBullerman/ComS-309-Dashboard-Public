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
@Import({RoleService.class, PermissionService.class})
@ActiveProfiles("test")
class RoleServiceTest {

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private PermissionRepository permissionRepository;

    @Autowired
    private RoleService roleService;

    @Test
    void addPermissionToRole_persistsRelationship() {
        Role role = new Role();
        role.setRoleName("TA");
        roleRepository.save(role);

        Permission permission = new Permission();
        permission.setName("TASK_EDIT");
        permissionRepository.save(permission);

        roleService.addPermissionToRole(role.getId(), "TASK_EDIT");

        Role updated = roleRepository.findById(role.getId()).orElseThrow();
        assertThat(updated.getPermissionNames()).containsExactly("TASK_EDIT");
    }

    @Test
    void removePermissionToRole_clearsRelationship() {
        Role role = new Role();
        role.setRoleName("MANAGER");
        roleRepository.save(role);

        Permission permission = new Permission();
        permission.setName("TEAM_DELETE");
        permissionRepository.save(permission);

        roleService.addPermissionToRole(role.getId(), "TEAM_DELETE");
        roleService.removePermissionToRole(role.getId(), "TEAM_DELETE");

        Role updated = roleRepository.findById(role.getId()).orElseThrow();
        assertThat(updated.getPermissions()).isEmpty();
    }
}
