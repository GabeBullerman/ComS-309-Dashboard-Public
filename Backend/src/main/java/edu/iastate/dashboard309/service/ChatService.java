package edu.iastate.dashboard309.service;

import edu.iastate.dashboard309.dto.ChatMessageDto;
import edu.iastate.dashboard309.model.ChatMention;
import edu.iastate.dashboard309.model.ChatMessage;
import edu.iastate.dashboard309.model.ChatRead;
import edu.iastate.dashboard309.repository.ChatMessageRepository;
import edu.iastate.dashboard309.repository.ChatReadRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class ChatService {

    static final List<String> CHANNELS = List.of("general", "system-feedback");

    private final ChatMessageRepository messageRepo;
    private final ChatReadRepository readRepo;

    public ChatService(ChatMessageRepository messageRepo, ChatReadRepository readRepo) {
        this.messageRepo = messageRepo;
        this.readRepo = readRepo;
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
        return new ChatMessageDto(
            msg.getId(), msg.getSenderNetid(), msg.getSenderName(), msg.getContent(),
            replyToId, replyPreview, netids, roles,
            msg.isEdited(), msg.getCreatedAt(), msg.getUpdatedAt(), msg.getChannelName()
        );
    }
}
