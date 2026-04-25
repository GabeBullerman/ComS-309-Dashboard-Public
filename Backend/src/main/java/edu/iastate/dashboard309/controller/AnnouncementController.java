package edu.iastate.dashboard309.controller;

import edu.iastate.dashboard309.dto.AnnouncementDto;
import edu.iastate.dashboard309.dto.AnnouncementRequest;
import edu.iastate.dashboard309.model.Announcement;
import edu.iastate.dashboard309.model.User;
import edu.iastate.dashboard309.repository.AnnouncementRepository;
import edu.iastate.dashboard309.repository.UserRepository;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/announcements")
public class AnnouncementController {

    private final AnnouncementRepository announcementRepository;
    private final UserRepository userRepository;

    public AnnouncementController(AnnouncementRepository announcementRepository,
                                  UserRepository userRepository) {
        this.announcementRepository = announcementRepository;
        this.userRepository = userRepository;
    }

    @GetMapping
    public List<AnnouncementDto> list() {
        return announcementRepository.findByActiveTrueOrderByCreatedAtDesc()
                .stream().map(this::toDto).toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public AnnouncementDto create(@Valid @RequestBody AnnouncementRequest req,
                                  Authentication auth) {
        requireStaff(auth);
        User user = userRepository.findByNetid(auth.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        Announcement a = new Announcement();
        a.setMessage(req.message().trim());
        a.setCreatedByNetid(auth.getName());
        a.setCreatedByName(user.getName());
        return toDto(announcementRepository.save(a));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id, Authentication auth) {
        Announcement a = announcementRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Announcement not found"));

        boolean isOwner = a.getCreatedByNetid().equals(auth.getName());
        boolean isHtaOrInstructor = auth.getAuthorities().stream()
                .anyMatch(au -> au.getAuthority().equalsIgnoreCase("HTA")
                             || au.getAuthority().equalsIgnoreCase("INSTRUCTOR"));

        if (!isOwner && !isHtaOrInstructor) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not authorised");
        }
        a.setActive(false);
        announcementRepository.save(a);
    }

    private void requireStaff(Authentication auth) {
        boolean isStaff = auth.getAuthorities().stream()
                .anyMatch(a -> {
                    String authority = a.getAuthority();
                    return authority.equalsIgnoreCase("TA")
                        || authority.equalsIgnoreCase("HTA")
                        || authority.equalsIgnoreCase("INSTRUCTOR");
                });
        if (!isStaff) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Staff only");
    }

    private AnnouncementDto toDto(Announcement a) {
        return new AnnouncementDto(a.getId(), a.getMessage(),
                a.getCreatedByNetid(), a.getCreatedByName(), a.getCreatedAt());
    }
}
