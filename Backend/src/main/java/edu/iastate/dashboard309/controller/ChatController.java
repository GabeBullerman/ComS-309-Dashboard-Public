package edu.iastate.dashboard309.controller;

import edu.iastate.dashboard309.dto.ChatMessageDto;
import edu.iastate.dashboard309.model.User;
import edu.iastate.dashboard309.repository.UserRepository;
import edu.iastate.dashboard309.service.ChatService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/chat")
public class ChatController {

    private final ChatService chatService;
    private final UserRepository userRepository;

    public ChatController(ChatService chatService, UserRepository userRepository) {
        this.chatService = chatService;
        this.userRepository = userRepository;
    }

    @GetMapping("/messages")
    public List<ChatMessageDto> getMessages(
            @RequestParam(required = false) Long before,
            @RequestParam(defaultValue = "50") int limit,
            Authentication authentication) {
        requireStaff(authentication);
        return chatService.getMessages(before, Math.min(limit, 100));
    }

    public record CreateRequest(
        @NotBlank String content,
        Long replyToId,
        List<String> mentionedNetids,
        List<String> mentionedRoles
    ) {}

    @PostMapping("/messages")
    @ResponseStatus(HttpStatus.CREATED)
    public ChatMessageDto create(@Valid @RequestBody CreateRequest req, Authentication authentication) {
        requireStaff(authentication);
        User sender = getUser(authentication);
        return chatService.createMessage(
            sender.getNetid(), sender.getName(),
            req.content(), req.replyToId(),
            req.mentionedNetids(), req.mentionedRoles()
        );
    }

    public record EditRequest(
        @NotBlank String content,
        List<String> mentionedNetids,
        List<String> mentionedRoles
    ) {}

    @PutMapping("/messages/{id}")
    public ChatMessageDto edit(@PathVariable Long id, @Valid @RequestBody EditRequest req,
                               Authentication authentication) {
        requireStaff(authentication);
        return chatService.editMessage(
            id, authentication.getName(),
            req.content(), req.mentionedNetids(), req.mentionedRoles()
        );
    }

    @DeleteMapping("/messages/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id, Authentication authentication) {
        requireStaff(authentication);
        chatService.deleteMessage(id, authentication.getName());
    }

    public record UnreadResponse(long count) {}

    @GetMapping("/unread")
    public UnreadResponse getUnread(Authentication authentication) {
        requireStaff(authentication);
        return new UnreadResponse(chatService.getUnreadCount(authentication.getName()));
    }

    public record MarkReadRequest(Long lastMessageId) {}

    @PostMapping("/mark-read")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void markRead(@RequestBody MarkReadRequest req, Authentication authentication) {
        requireStaff(authentication);
        chatService.markRead(authentication.getName(), req.lastMessageId());
    }

    private void requireStaff(Authentication authentication) {
        boolean isStaff = authentication.getAuthorities().stream()
            .anyMatch(a -> {
                String auth = a.getAuthority();
                return auth.equalsIgnoreCase("TA")
                    || auth.equalsIgnoreCase("HTA")
                    || auth.equalsIgnoreCase("INSTRUCTOR");
            });
        if (!isStaff) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Staff only");
    }

    private User getUser(Authentication authentication) {
        return userRepository.findByNetid(authentication.getName())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    }
}
