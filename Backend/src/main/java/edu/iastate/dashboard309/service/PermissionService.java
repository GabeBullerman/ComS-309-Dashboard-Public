package edu.iastate.dashboard309.service;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import edu.iastate.dashboard309.dto.PermissionRequest;
import edu.iastate.dashboard309.model.Permission;
import edu.iastate.dashboard309.repository.PermissionRepository;

@Service
public class PermissionService {
    
    private final PermissionRepository permissionRepository;

    public PermissionService(PermissionRepository permissionRepository){
        this.permissionRepository = permissionRepository;
    }

    @Transactional
    public PermissionRequest getPermissionById(Long id){
        Permission permission = permissionRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Permission not found"));
        return new PermissionRequest(permission.getId(), permission.getName());
    }

    @Transactional
    public List<PermissionRequest> getAllPermissions(){
        List<Permission> permissions = permissionRepository.findAll();
        return permissions.stream()
            .map(p -> getPermissionById(p.getId()))
            .toList();
    }

    @Transactional
    public List<String> getPermissionNames(List<Permission> permissions){
        return permissions.stream()
            .map(p -> p.getName())
            .toList();
    }
}
