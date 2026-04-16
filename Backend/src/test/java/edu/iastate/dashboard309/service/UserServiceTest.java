package edu.iastate.dashboard309.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

import edu.iastate.dashboard309.dto.UserRequest;
import edu.iastate.dashboard309.model.Role;
import edu.iastate.dashboard309.model.User;
import edu.iastate.dashboard309.repository.RefreshTokenRepository;
import edu.iastate.dashboard309.repository.RoleRepository;
import edu.iastate.dashboard309.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.web.server.ResponseStatusException;

@DataJpaTest
@Import(UserService.class)
@ActiveProfiles("test")
class UserServiceTest {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private RefreshTokenRepository refreshTokenRepository;

    @Autowired
    private UserService userService;

    @Test
    void getUserById_returnsUserRequest() {
        Role role = new Role();
        role.setRoleName("TA");
        roleRepository.save(role);

        User user = new User();
        user.setName("Alex");
        user.setNetid("alex1");
        user.setPassword("secret");
        user.setRole(role);
        userRepository.save(user);

        UserRequest result = userService.getUserById(user.getId()); // Update this if you construct UserRequest manually elsewhere

        assertThat(result.name()).isEqualTo("Alex");
        assertThat(result.netid()).isEqualTo("alex1");
        assertThat(result.role()).containsExactly("TA");
    }

    @Test
    void getUsersWithRoleName_throwsWhenRoleMissing() {
        assertThrows(ResponseStatusException.class,
            () -> userService.getUsersWithRoleName("MISSING"));
    }

    @Test
    void getUsersWithRoleName_returnsMatchingUsers() {
        Role role = new Role();
        role.setRoleName("STUDENT");
        roleRepository.save(role);

        User userOne = new User();
        userOne.setName("Sam");
        userOne.setNetid("sam1");
        userOne.setPassword("pw1");
        userOne.setRole(role);
        userRepository.save(userOne);

        User userTwo = new User();
        userTwo.setName("Riley");
        userTwo.setNetid("riley1");
        userTwo.setPassword("pw2");
        userTwo.setRole(role);
        userRepository.save(userTwo);

        assertThat(userService.getUsersWithRoleName("STUDENT"))
            .hasSize(2)
            .allSatisfy(user -> assertThat(user.role()).containsExactly("STUDENT"));
    }
}
