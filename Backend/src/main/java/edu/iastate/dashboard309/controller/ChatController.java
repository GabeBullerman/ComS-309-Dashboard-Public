package edu.iastate.dashboard309.controller;

import edu.iastate.dashboard309.dto.ChatChannelDto;
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
import java.util.Map;

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
            @RequestParam(defaultValue = "general") String channel,
            Authentication authentication) {
        requireStaff(authentication);
        return chatService.getMessages(before, Math.min(limit, 100), channel);
    }

    public record CreateRequest(
        @NotBlank String content,
        Long replyToId,
        List<String> mentionedNetids,
        List<String> mentionedRoles,
        String channel
    ) {}

    @PostMapping("/messages")
    @ResponseStatus(HttpStatus.CREATED)
    public ChatMessageDto create(@Valid @RequestBody CreateRequest req, Authentication authentication) {
        requireStaff(authentication);
        if ("announcements".equals(req.channel()) && !authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equalsIgnoreCase("INSTRUCTOR"))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only Instructors can post in Announcements");
        }
        User sender = getUser(authentication);
        return chatService.createMessage(
            sender.getNetid(), sender.getName(),
            req.content(), req.replyToId(),
            req.mentionedNetids(), req.mentionedRoles(),
            req.channel() != null ? req.channel() : "general"
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

    /** Total tag count across all channels — used by the nav badge. */
    @GetMapping("/unread")
    public UnreadResponse getUnread(Authentication authentication) {
        requireStaff(authentication);
        return new UnreadResponse(chatService.getUnreadCount(authentication.getName(), extractRole(authentication)));
    }

    /** Per-channel tag counts — used by the in-chat channel sidebar. */
    @GetMapping("/unread/all")
    public Map<String, Long> getAllUnread(Authentication authentication) {
        requireStaff(authentication);
        return chatService.getAllUnreadCounts(authentication.getName(), extractRole(authentication));
    }

    @GetMapping("/channels")
    public List<ChatChannelDto> getChannels(Authentication authentication) {
        requireStaff(authentication);
        return chatService.getChannels();
    }

    public record UpdateChannelRequest(String displayName, String description) {}

    @PutMapping("/channels/{id}")
    public ChatChannelDto updateChannel(@PathVariable String id,
                                        @RequestBody UpdateChannelRequest req,
                                        Authentication authentication) {
        requireStaff(authentication);
        if (!authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equalsIgnoreCase("INSTRUCTOR"))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Instructor only");
        }
        return chatService.updateChannel(id, req.displayName(), req.description());
    }

    public record MarkReadRequest(Long lastMessageId, String channel) {}

    @PostMapping("/mark-read")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void markRead(@RequestBody MarkReadRequest req, Authentication authentication) {
        requireStaff(authentication);
        String channel = req.channel() != null ? req.channel() : "general";
        chatService.markRead(authentication.getName(), req.lastMessageId(), channel);
    }

    private String extractRole(Authentication authentication) {
        return authentication.getAuthorities().stream()
            .map(a -> a.getAuthority())
            .filter(a -> a.equalsIgnoreCase("TA") || a.equalsIgnoreCase("HTA") || a.equalsIgnoreCase("INSTRUCTOR"))
            .findFirst()
            .orElse("TA");
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
