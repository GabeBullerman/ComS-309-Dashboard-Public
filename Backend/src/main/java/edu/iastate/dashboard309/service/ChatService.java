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
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Service
public class ChatService {

    private final ChatMessageRepository messageRepo;
    private final ChatReadRepository readRepo;

    public ChatService(ChatMessageRepository messageRepo, ChatReadRepository readRepo) {
        this.messageRepo = messageRepo;
        this.readRepo = readRepo;
    }

    @Transactional(readOnly = true)
    public List<ChatMessageDto> getMessages(Long before, int limit) {
        List<ChatMessage> messages = before == null
            ? messageRepo.findLatest(PageRequest.of(0, limit))
            : messageRepo.findBefore(before, PageRequest.of(0, limit));
        Collections.reverse(messages);
        return messages.stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public long getUnreadCount(String netid) {
        return readRepo.findById(netid)
            .map(r -> r.getLastReadMessageId() == null
                ? messageRepo.count()
                : messageRepo.countByIdGreaterThan(r.getLastReadMessageId()))
            .orElseGet(messageRepo::count);
    }

    @Transactional
    public void markRead(String netid, Long lastMessageId) {
        ChatRead read = readRepo.findById(netid).orElseGet(() -> {
            ChatRead r = new ChatRead();
            r.setNetid(netid);
            return r;
        });
        read.setLastReadMessageId(lastMessageId);
        readRepo.save(read);
    }

    @Transactional
    public ChatMessageDto createMessage(String senderNetid, String senderName, String content,
                                        Long replyToId, List<String> mentionedNetids, List<String> mentionedRoles) {
        ChatMessage msg = new ChatMessage();
        msg.setSenderNetid(senderNetid);
        msg.setSenderName(senderName);
        msg.setContent(content);
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
        List<ChatMention> mentions = new ArrayList<>();
        if (netids != null) {
            for (String netid : netids) {
                ChatMention m = new ChatMention();
                m.setMessage(msg);
                m.setMentionedNetid(netid);
                mentions.add(m);
            }
        }
        if (roles != null) {
            for (String role : roles) {
                ChatMention m = new ChatMention();
                m.setMessage(msg);
                m.setMentionedRole(role);
                mentions.add(m);
            }
        }
        msg.getMentions().addAll(mentions);
    }

    private ChatMessageDto toDto(ChatMessage msg) {
        List<String> netids = msg.getMentions().stream()
            .filter(m -> m.getMentionedNetid() != null)
            .map(ChatMention::getMentionedNetid)
            .toList();
        List<String> roles = msg.getMentions().stream()
            .filter(m -> m.getMentionedRole() != null)
            .map(ChatMention::getMentionedRole)
            .toList();
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
            msg.isEdited(), msg.getCreatedAt(), msg.getUpdatedAt()
        );
    }
}
