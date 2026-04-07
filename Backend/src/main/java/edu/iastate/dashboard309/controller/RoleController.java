package edu.iastate.dashboard309.controller;

import edu.iastate.dashboard309.dto.RoleRequest;
import edu.iastate.dashboard309.model.Role;
import edu.iastate.dashboard309.repository.PermissionRepository;
import edu.iastate.dashboard309.repository.RoleRepository;
import edu.iastate.dashboard309.service.RoleService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
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
@RequestMapping("/api/roles")
public class RoleController {

    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;
    private final RoleService roleService;

    public RoleController(RoleRepository roleRepository, PermissionRepository permissionRepository, RoleService roleService) {
        this.roleRepository = roleRepository;
        this.permissionRepository = permissionRepository;;
        this.roleService = roleService;
    }

    //@PreAuthorize("hasAuthority('ADMIN')")
    @GetMapping
    public List<RoleRequest> list() {
        return roleService.getAllRoles();
    }

    //@PreAuthorize("hasAuthority('ADMIN')")
    @GetMapping("/{id}")
    public RoleRequest get(@PathVariable Long id) {
        roleRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Role not found"));
        return roleService.getRoleById(id);
    }

    //@PreAuthorize("hasAuthority('ADMIN')")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public RoleRequest create(@Valid @RequestBody RoleRequest request) {
        if (roleRepository.existsByRoleName(request.roleName())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Role already exists");
        }
        Role role = new Role();
        role.setRoleName(request.roleName());
        roleRepository.save(role);
        return roleService.getRoleById(role.getId());
    }

    //@PreAuthorize("hasAuthority('ADMIN')")
    @PutMapping("/{id}")
    public RoleRequest update(@PathVariable Long id, @Valid @RequestBody RoleRequest request) {
        Role role = roleRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Role not found"));
        if (!role.getRoleName().equals(request.roleName())
                && roleRepository.existsByRoleName(request.roleName())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Role already exists");
        }
        for(String permissions : request.permissions()){
            if(!permissionRepository.existsByName(permissions)){
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Permission not found");
            }
        }
        role.setRoleName(request.roleName());
        roleRepository.save(role);
        return roleService.getRoleById(role.getId());
    }

    //@PreAuthorize("hasAuthority('ADMIN')")
    @PutMapping("/{id}/permissions/add/{permissionName}")
    public RoleRequest addPermission(@PathVariable Long id, @PathVariable String permissionName){
        Role role = roleRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Role not found"));
        permissionRepository.findByName(permissionName)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT, "Permission not found"));
        roleService.addPermissionToRole(id, permissionName);
        roleRepository.save(role);
        return roleService.getRoleById(id);
    }

    //@PreAuthorize("hasAuthority('ADMIN')")
    @PutMapping("/{id}/permissions/remove/{permissionName}")
    public RoleRequest removePermission(@PathVariable Long id, @PathVariable String permissionName){
        Role role = roleRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Role not found"));
        permissionRepository.findByName(permissionName)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Permission not found"));
        roleService.removePermissionToRole(id, permissionName);
        roleRepository.save(role);
        return roleService.getRoleById(id);
    }

    //@PreAuthorize("hasAuthority('ADMIN')")
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        if (!roleRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Role not found");
        }
        roleRepository.deleteById(id);
    }
}
