package edu.iastate.dashboard309.service;

import edu.iastate.dashboard309.dto.ChatChannelDto;
import edu.iastate.dashboard309.dto.ChatMessageDto;
import edu.iastate.dashboard309.model.ChatChannel;
import edu.iastate.dashboard309.model.ChatMention;
import edu.iastate.dashboard309.model.ChatMessage;
import edu.iastate.dashboard309.model.ChatReaction;
import edu.iastate.dashboard309.model.ChatRead;
import edu.iastate.dashboard309.repository.ChatChannelRepository;
import edu.iastate.dashboard309.repository.ChatMessageRepository;
import edu.iastate.dashboard309.repository.ChatReactionRepository;
import edu.iastate.dashboard309.repository.ChatReadRepository;
import jakarta.annotation.PostConstruct;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;
import java.util.Map;

@Service
public class ChatService {

    static final List<String> CHANNELS = List.of("general", "system-feedback", "announcements");

    private final ChatMessageRepository messageRepo;
    private final ChatReadRepository readRepo;
    private final ChatChannelRepository channelRepo;
    private final ChatReactionRepository reactionRepo;

    public ChatService(ChatMessageRepository messageRepo, ChatReadRepository readRepo,
                       ChatChannelRepository channelRepo, ChatReactionRepository reactionRepo) {
        this.messageRepo = messageRepo;
        this.readRepo = readRepo;
        this.channelRepo = channelRepo;
        this.reactionRepo = reactionRepo;
    }

    @PostConstruct
    public void seedChannels() {
        if (!channelRepo.existsById("general")) {
            channelRepo.save(new ChatChannel("general", "General", null));
        }
        if (!channelRepo.existsById("system-feedback")) {
            channelRepo.save(new ChatChannel("system-feedback", "System Feedback",
                "Report bugs, suggest improvements, or discuss feature requests"));
        }
        if (!channelRepo.existsById("announcements")) {
            channelRepo.save(new ChatChannel("announcements", "Announcements",
                "Important updates from the Instructor — read only for TAs and HTAs"));
        }
    }

    @Transactional(readOnly = true)
    public List<ChatChannelDto> getChannels() {
        return CHANNELS.stream()
            .map(id -> channelRepo.findById(id)
                .map(c -> new ChatChannelDto(c.getId(), c.getDisplayName(), c.getDescription()))
                .orElse(new ChatChannelDto(id, id, null)))
            .toList();
    }

    @Transactional
    public ChatChannelDto updateChannel(String id, String displayName, String description) {
        ChatChannel ch = channelRepo.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Channel not found"));
        if (displayName != null && !displayName.isBlank()) ch.setDisplayName(displayName);
        ch.setDescription(description);
        channelRepo.save(ch);
        return new ChatChannelDto(ch.getId(), ch.getDisplayName(), ch.getDescription());
    }

    @Transactional(readOnly = true)
    public List<ChatMessageDto> getMessages(Long before, int limit, String channel) {
        List<ChatMessage> messages = before == null
            ? messageRepo.findLatestInChannel(channel, PageRequest.of(0, limit))
            : messageRepo.findBeforeInChannel(before, channel, PageRequest.of(0, limit));
        Collections.reverse(messages);
        return messages.stream().map(this::toDto).toList();
    }

    /** Total tag-notification count across all channels (for the nav badge). */
    @Transactional(readOnly = true)
    public long getUnreadCount(String netid, String role) {
        Map<String, Long> readMap = readRepo.findByNetid(netid).stream()
            .collect(Collectors.toMap(ChatRead::getChannelName,
                r -> r.getLastReadMessageId() == null ? 0L : r.getLastReadMessageId()));
        return CHANNELS.stream()
            .mapToLong(ch -> messageRepo.countTagsAfter(netid, role, readMap.getOrDefault(ch, 0L), ch))
            .sum();
    }

    /** Per-channel tag-notification counts (for the in-chat channel list). */
    @Transactional(readOnly = true)
    public Map<String, Long> getAllUnreadCounts(String netid, String role) {
        Map<String, Long> readMap = readRepo.findByNetid(netid).stream()
            .collect(Collectors.toMap(ChatRead::getChannelName,
                r -> r.getLastReadMessageId() == null ? 0L : r.getLastReadMessageId()));
        Map<String, Long> result = new LinkedHashMap<>();
        for (String ch : CHANNELS) {
            result.put(ch, messageRepo.countTagsAfter(netid, role, readMap.getOrDefault(ch, 0L), ch));
        }
        return result;
    }

    @Transactional
    public void markRead(String netid, Long lastMessageId, String channel) {
        String id = ChatRead.makeId(netid, channel);
        ChatRead read = readRepo.findById(id).orElseGet(() -> {
            ChatRead r = new ChatRead();
            r.setId(id);
            r.setNetid(netid);
            r.setChannelName(channel);
            return r;
        });
        read.setLastReadMessageId(lastMessageId);
        readRepo.save(read);
    }

    @Transactional
    public ChatMessageDto createMessage(String senderNetid, String senderName, String content,
                                        Long replyToId, List<String> mentionedNetids,
                                        List<String> mentionedRoles, String channel) {
        ChatMessage msg = new ChatMessage();
        msg.setSenderNetid(senderNetid);
        msg.setSenderName(senderName);
        msg.setContent(content);
        msg.setChannelName(CHANNELS.contains(channel) ? channel : "general");
        if (replyToId != null) {
            messageRepo.findById(replyToId).ifPresent(msg::setReplyTo);
        }
        buildMentions(msg, mentionedNetids, mentionedRoles);
        messageRepo.save(msg);
        return toDto(msg);
    }

    @Transactional
    public ChatMessageDto editMessage(Long id, String callerNetid, String content,
                                      List<String> mentionedNetids, List<String> mentionedRoles) {
        ChatMessage msg = messageRepo.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Message not found"));
        if (!msg.getSenderNetid().equals(callerNetid)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cannot edit another user's message");
        }
        msg.setContent(content);
        msg.setEdited(true);
        msg.setUpdatedAt(LocalDateTime.now());
        msg.getMentions().clear();
        buildMentions(msg, mentionedNetids, mentionedRoles);
        messageRepo.save(msg);
        return toDto(msg);
    }

    @Transactional
    public void deleteMessage(Long id, String callerNetid) {
        ChatMessage msg = messageRepo.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Message not found"));
        if (!msg.getSenderNetid().equals(callerNetid)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cannot delete another user's message");
        }
        messageRepo.delete(msg);
    }

    @Transactional
    public ChatMessageDto toggleReaction(Long messageId, String emoji, String userNetid) {
        ChatMessage msg = messageRepo.findById(messageId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Message not found"));
        reactionRepo.findByMessage_IdAndEmojiAndUserNetid(messageId, emoji, userNetid)
            .ifPresentOrElse(
                existing -> {
                    msg.getReactions().remove(existing);
                    reactionRepo.delete(existing);
                },
                () -> {
                    ChatReaction r = new ChatReaction();
                    r.setMessage(msg);
                    r.setEmoji(emoji);
                    r.setUserNetid(userNetid);
                    msg.getReactions().add(r);
                    reactionRepo.save(r);
                }
            );
        return toDto(msg);
    }

    private void buildMentions(ChatMessage msg, List<String> netids, List<String> roles) {
        if (netids != null) {
            for (String netid : netids) {
                ChatMention m = new ChatMention();
                m.setMessage(msg);
                m.setMentionedNetid(netid);
                msg.getMentions().add(m);
            }
        }
        if (roles != null) {
            for (String role : roles) {
                ChatMention m = new ChatMention();
                m.setMessage(msg);
                m.setMentionedRole(role);
                msg.getMentions().add(m);
            }
        }
    }

    private ChatMessageDto toDto(ChatMessage msg) {
        List<String> netids = msg.getMentions().stream()
            .filter(m -> m.getMentionedNetid() != null)
            .map(ChatMention::getMentionedNetid).toList();
        List<String> roles = msg.getMentions().stream()
            .filter(m -> m.getMentionedRole() != null)
            .map(ChatMention::getMentionedRole).toList();
        ChatMessageDto.ReplyPreview replyPreview = null;
        Long replyToId = null;
        if (msg.getReplyTo() != null) {
            ChatMessage r = msg.getReplyTo();
            replyToId = r.getId();
            replyPreview = new ChatMessageDto.ReplyPreview(
                r.getId(), r.getSenderNetid(), r.getSenderName(), r.getContent());
        }
        Map<String, List<String>> reactions = msg.getReactions().stream()
            .collect(Collectors.groupingBy(
                ChatReaction::getEmoji,
                Collectors.mapping(ChatReaction::getUserNetid, Collectors.toList())
            ));
        return new ChatMessageDto(
            msg.getId(), msg.getSenderNetid(), msg.getSenderName(), msg.getContent(),
            replyToId, replyPreview, netids, roles,
            msg.isEdited(), msg.getCreatedAt(), msg.getUpdatedAt(), msg.getChannelName(),
            reactions
        );
    }
}
