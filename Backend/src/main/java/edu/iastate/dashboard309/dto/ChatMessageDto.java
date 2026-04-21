package edu.iastate.dashboard309.dto;

import java.time.LocalDateTime;
import java.util.List;

public record ChatMessageDto(
    Long id,
    String senderNetid,
    String senderName,
    String content,
    Long replyToId,
    ReplyPreview replyTo,
    List<String> mentionedNetids,
    List<String> mentionedRoles,
    boolean edited,
    LocalDateTime createdAt,
    LocalDateTime updatedAt,
    String channelName
) {
    public record ReplyPreview(Long id, String senderNetid, String senderName, String content) {}
}
