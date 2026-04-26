package edu.iastate.dashboard309.dto;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

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
    String channelName,
    Map<String, List<String>> reactions
) {
    public record ReplyPreview(Long id, String senderNetid, String senderName, String content) {}
}
