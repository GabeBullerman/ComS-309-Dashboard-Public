package edu.iastate.dashboard309.controller;

import edu.iastate.dashboard309.dto.PermissionRequest;
import edu.iastate.dashboard309.model.Permission;
import edu.iastate.dashboard309.repository.PermissionRepository;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
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
@RequestMapping("/api/permissions")
public class PermissionController {
    private final PermissionRepository permissionRepository;

    public PermissionController(PermissionRepository permissionRepository) {
        this.permissionRepository = permissionRepository;
    }

    @GetMapping
    public List<Permission> list() {
        return permissionRepository.findAll();
    }

    @GetMapping("/{id}")
    public Permission get(@PathVariable Long id) {
        return permissionRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Permission not found"));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Permission create(@Valid @RequestBody PermissionRequest request) {
        if (permissionRepository.existsByName(request.name())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Permission already exists");
        }
        Permission permission = new Permission();
        permission.setName(request.name());
        return permissionRepository.save(permission);
    }

    @PutMapping("/{id}")
    public Permission update(@PathVariable Long id, @Valid @RequestBody PermissionRequest request) {
        Permission permission = permissionRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Permission not found"));
        if (!permission.getName().equals(request.name())
                && permissionRepository.existsByName(request.name())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Permission already exists");
        }
        permission.setName(request.name());
        return permissionRepository.save(permission);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        if (!permissionRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Permission not found");
        }
        permissionRepository.deleteById(id);
    }
}
