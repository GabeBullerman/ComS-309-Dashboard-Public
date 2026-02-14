package edu.iastate.dashboard309.controller;

import edu.iastate.dashboard309.dto.RoleRequest;
import edu.iastate.dashboard309.model.Role;
import edu.iastate.dashboard309.repository.RoleRepository;
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
@RequestMapping("/api/roles")
public class RoleController {
    private final RoleRepository roleRepository;

    public RoleController(RoleRepository roleRepository) {
        this.roleRepository = roleRepository;
    }

    @GetMapping
    public List<Role> list() {
        return roleRepository.findAll();
    }

    @GetMapping("/{id}")
    public Role get(@PathVariable Long id) {
        return roleRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Role not found"));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Role create(@Valid @RequestBody RoleRequest request) {
        if (roleRepository.existsByRoleName(request.roleName())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Role already exists");
        }
        Role role = new Role();
        role.setRoleName(request.roleName());
        return roleRepository.save(role);
    }

    @PutMapping("/{id}")
    public Role update(@PathVariable Long id, @Valid @RequestBody RoleRequest request) {
        Role role = roleRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Role not found"));
        if (!role.getRoleName().equals(request.roleName())
                && roleRepository.existsByRoleName(request.roleName())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Role already exists");
        }
        role.setRoleName(request.roleName());
        return roleRepository.save(role);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        if (!roleRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Role not found");
        }
        roleRepository.deleteById(id);
    }
}
