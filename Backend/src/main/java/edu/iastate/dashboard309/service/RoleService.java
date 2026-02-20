package edu.iastate.dashboard309.service;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import edu.iastate.dashboard309.dto.RoleRequest;
import edu.iastate.dashboard309.model.Permission;
import edu.iastate.dashboard309.model.Role;
import edu.iastate.dashboard309.repository.PermissionRepository;
import edu.iastate.dashboard309.repository.RoleRepository;
import jakarta.transaction.Transactional;

@Service
public class RoleService {
    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;
    private final PermissionService permissionService;

    public RoleService(RoleRepository roleRepository, PermissionRepository permissionRepository, PermissionService permissionService) {
        this.roleRepository = roleRepository;
        this.permissionService = permissionService;
        this.permissionRepository = permissionRepository;
    }

    @Transactional
    public RoleRequest getRoleById(Long id){
        Role role = roleRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Task not found"));
        return new RoleRequest(role.getId(), role.getRoleName(), permissionService.getPermissionNames(role.getPermissions()));
    }

    @Transactional
    public List<RoleRequest> getAllRoles(){
        List<Role> roles = roleRepository.findAll();
        return roles.stream()
            .map(r -> getRoleById(r.getId()))
            .toList();
    }

    @Transactional
    public void addPermissionToRole(Long id, String permissionName){
        Role role = roleRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Role not found"));

        Permission permission = permissionRepository.findByName(permissionName)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Permission not found"));

        role.addPermission(permission);
    }

    @Transactional
    public void removePermissionToRole(Long id, String permissionName){
        Role role = roleRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Role not found"));

        Permission permission = permissionRepository.findByName(permissionName)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Permission not found"));

        role.removePermission(permission);
    }
}
