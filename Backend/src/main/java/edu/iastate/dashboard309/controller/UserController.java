package edu.iastate.dashboard309.controller;

import edu.iastate.dashboard309.dto.GitlabTokenRequest;
import edu.iastate.dashboard309.dto.TeamRequest;
import edu.iastate.dashboard309.dto.UserRequest;
import edu.iastate.dashboard309.model.Role;
import edu.iastate.dashboard309.model.User;
import edu.iastate.dashboard309.repository.RoleRepository;
import edu.iastate.dashboard309.repository.UserRepository;
import edu.iastate.dashboard309.service.TeamService;
import edu.iastate.dashboard309.service.UserService;
import jakarta.validation.Valid;
import jakarta.websocket.server.PathParam;

import java.util.List;
import java.util.Map;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.bind.annotation.RequestParam;


@RestController
@RequestMapping("/api/users")
public class UserController {

    private final PasswordEncoder passwordEncoder;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final UserService userService;
    private final TeamService teamService;

    public UserController(UserRepository userRepository,
                          RoleRepository roleRepository,
                          UserService userService,
                          TeamService teamService, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.userService = userService;
        this.teamService = teamService;
        this.passwordEncoder = passwordEncoder;
    }

    @GetMapping
    public Page<UserRequest> list(@RequestParam(required = false) String role,
                                  @RequestParam(required = false) String search,
                                  @PageableDefault(size = 20) Pageable pageable) {
        String normalizedRole = normalize(role);
        String normalizedSearch = normalize(search);
        return userService.getUsers(normalizedRole, normalizedSearch, pageable);
    }

    @GetMapping("/self")
    public UserRequest getSelf(Authentication authentication) {
        return userService.getUserByNetid(authentication.getName());
    }
    

    @GetMapping("/{id}")
    public UserRequest get(@PathVariable Long id) {
        return userService.getUserById(id);
    }

    @GetMapping("/netid/{netid}")
    public UserRequest getByNetid(@PathVariable String netid) {
        return userService.getUserByNetid(netid);
    }

    @GetMapping("/{id}/team")
    public TeamRequest getTeamForUser(@PathVariable Long id) {
        return teamService.getTeamByUserId(id);
    }

    @GetMapping("/{id}/gitlab-token")
    public String getGitlabToken(@PathVariable Long id){
        User user = userRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        return user.getGitlabToken();
    }

    @GetMapping("/self/gitlab-token")
    public String getSelfGitlabToken(Authentication authentication){
        User user = userRepository.findByNetid(authentication.getName())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        return user.getGitlabToken();
    }

    @GetMapping("/{id}/initials")
    public String getInitials(@PathVariable Long id){
        User user = userRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        return user.getInitials();
    }

    @GetMapping("/initials/{initials}")
    public List<UserRequest> getTAsWithInitials(@PathVariable String initials){
        return userService.getTAsWithInitials(initials);
    }

    @GetMapping("/role/{role}")
    public List<UserRequest> getUsersWithRole(@PathVariable String role){
        return userService.getUsersWithRoleName(role);
    }

    @GetMapping("/{id}/contributions")
    public Integer getContributions(@PathVariable Long id) {
        User user = userRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        return user.getContributions();
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

        // Set initials
        StringBuilder initials = new StringBuilder();
        for (String word : request.name().trim().split("\\s+")) {
            initials.append(Character.toUpperCase(word.charAt(0)));
        }
        user.setInitials(initials.toString());

        // Hash password
        user.setPassword(passwordEncoder.encode(request.password()));
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
        if (request.netid() != null && !user.getNetid().equals(request.netid()) && userRepository.existsByNetid(request.netid())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Netid already exists");
        }
        if (request.name() != null) {
            user.setName(request.name());
        }
        if (request.netid() != null) {
            user.setNetid(request.netid());
        }
        if (request.password() != null) {
            user.setPassword(passwordEncoder.encode(request.password()));
        }
        if (request.role() != null) {
            user.getRole().clear();
            for(String roleName : request.role()){
                Role role = roleRepository.findByRoleName(roleName)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Role not found"));
                user.setRole(role);
            }
        }
        if (request.contributions() != null) {
            user.setContributions(request.contributions());
        }
        if (request.projectRole() != null) {
            user.setProjectRole(request.projectRole());
        }
        userRepository.save(user);
        return userService.getUserById(user.getId());
    }

    @PutMapping("/{id}/gitlab-token")
    public void updateGitlabToken(@PathVariable Long id, @Valid @RequestBody GitlabTokenRequest request ){
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        user.setGitlabToken(request.gitlabToken());
        userRepository.save(user);
    }

    @PutMapping("/self/gitlab-token")
    public void updateSelfGitlabToken(Authentication authentication, @Valid @RequestBody GitlabTokenRequest request ){
        User user = userRepository.findByNetid(authentication.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        user.setGitlabToken(request.gitlabToken());
        userRepository.save(user);
    }

    @PutMapping("/{id}/project-role")
    public UserRequest updateProjectRole(@PathVariable Long id, @RequestBody Map<String, String> body) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        user.setProjectRole(body.get("projectRole"));
        userRepository.save(user);
        return userService.getUserById(id);
    }

    @PreAuthorize("hasAuthority('CAN_CHANGE_INITIALS')")
    @PutMapping("/{id}/initials")
    public UserRequest updateInitials(@PathVariable Long id, @Valid @RequestParam String initials){
        if(initials == null || !initials.isBlank()){
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No \'initials\' provided");
        }
        User user = userRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        
        user.setInitials(initials);

        return userService.getUserById(id);
    }

    // TESTING/DEBUGGING ONLY. REMOVE IN PRODUCTION.
    @PutMapping("/testing/hashAllPasswords")
    public void hashAllPasswords(){
        List<User> list = userRepository.findAll();
        for (User user : list) {
            String password = user.getPassword();
            if(!isBCryptHash(password)){
                user.setPassword(passwordEncoder.encode(password));
                userRepository.save(user);
            }
        }
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

    private String normalize(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private boolean isBCryptHash(String password) {
    return password.startsWith("$2a$") ||
           password.startsWith("$2b$") ||
           password.startsWith("$2y$");
}
}
