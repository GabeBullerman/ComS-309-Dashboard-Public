package edu.iastate.dashboard309.controller;

import edu.iastate.dashboard309.dto.UserRequest;
import edu.iastate.dashboard309.model.Role;
import edu.iastate.dashboard309.model.User;
import edu.iastate.dashboard309.repository.RoleRepository;
import edu.iastate.dashboard309.repository.UserRepository;
import edu.iastate.dashboard309.service.UserService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
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
import org.springframework.web.bind.annotation.RequestParam;


@RestController
@RequestMapping("/api/users")
public class UserController {
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final UserService userService;

    public UserController(UserRepository userRepository,
                          RoleRepository roleRepository,
                          UserService userService) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.userService = userService;
    }

    @GetMapping
    public List<UserRequest> list() {
        return userService.getAllUsers();
    }

    @GetMapping("/self")
    public UserRequest getSelf(Authentication authentication) {
        return userService.getUserByNetid(authentication.getName());
    }
    

    @GetMapping("/{id}")
    public UserRequest get(@PathVariable Long id) {
        return userService.getUserById(id);
    }

    @GetMapping("/role/{role}")
    public List<UserRequest> getUsersWithRole(@PathVariable String role){
        return userService.getUsersWithRoleName(role);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public UserRequest create(@Valid @RequestBody UserRequest request) {
        if (userRepository.existsByNetid(request.netid())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Netid already exists");
        }
        User user = new User();
        user.setName(request.name());
        user.setNetid(request.netid());
        user.setPassword(request.password());
        System.out.println(request.role());
        for(String roleName : request.role()){
            Role role = roleRepository.findByRoleName(roleName)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Role not found"));
            user.setRole(role);
        }

        userRepository.save(user);

        return userService.getUserById(user.getId());
    }

    @PutMapping("/{id}")
    public UserRequest update(@PathVariable Long id, @Valid @RequestBody UserRequest request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        if (!user.getNetid().equals(request.netid()) && userRepository.existsByNetid(request.netid())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Netid already exists");
        }
        user.setName(request.name());
        user.setNetid(request.netid());
        user.setPassword(request.password());

        for(String role : request.role()){
            Role userRole = roleRepository.findByRoleName(role)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Role not found"));
            user.setRole(userRole);
        }

        userRepository.save(user);

        return userService.getUserById(user.getId());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        if (!userRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found");
        }
        userRepository.deleteById(id);

        // Remove all roles from user
        // Remove user from all teams
        //
    }
}
