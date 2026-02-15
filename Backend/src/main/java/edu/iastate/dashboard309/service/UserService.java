package edu.iastate.dashboard309.service;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import edu.iastate.dashboard309.dto.UserRequest;
import edu.iastate.dashboard309.model.User;
import edu.iastate.dashboard309.repository.UserRepository;

@Service
public class UserService {
    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Transactional
    public UserRequest getUserById(Long id){
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        // TODO: Change to handle multiple roles. Only takes the first role of the user at the moment.
        return new UserRequest(user.getName(), user.getNetid(), user.getPassword(), user.getRole().get(0).getRoleName());
    }
    
    @Transactional 
    public List<UserRequest> getAllUsers(){
        List<User> users = userRepository.findAll();
        return users.stream()
            .map(u -> getUserById(u.getId()))
            .toList();
    }
}
