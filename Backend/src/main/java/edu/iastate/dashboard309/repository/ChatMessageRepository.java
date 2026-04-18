package edu.iastate.dashboard309.repository;

import edu.iastate.dashboard309.model.ChatMessage;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    @Query("SELECT m FROM ChatMessage m WHERE m.channelName = :channel ORDER BY m.id DESC")
    List<ChatMessage> findLatestInChannel(@Param("channel") String channel, Pageable pageable);

    @Query("SELECT m FROM ChatMessage m WHERE m.id < :before AND m.channelName = :channel ORDER BY m.id DESC")
    List<ChatMessage> findBeforeInChannel(@Param("before") Long before, @Param("channel") String channel, Pageable pageable);

    /**
     * Count tag-relevant messages in a specific channel since lastReadId.
     * A message is relevant if it @-mentions the user by netid or role, or is a reply to their message.
     */
    @Query("""
        SELECT COUNT(m) FROM ChatMessage m
        WHERE m.id > :lastReadId
          AND m.channelName = :channel
          AND m.senderNetid != :netid
          AND (
            EXISTS (SELECT 1 FROM ChatMention cm WHERE cm.message = m AND cm.mentionedNetid = :netid)
            OR EXISTS (SELECT 1 FROM ChatMention cm WHERE cm.message = m AND LOWER(cm.mentionedRole) = LOWER(:role))
            OR EXISTS (SELECT 1 FROM ChatMessage parent WHERE parent = m.replyTo AND parent.senderNetid = :netid)
          )
        """)
    long countTagsAfter(@Param("netid") String netid, @Param("role") String role,
                        @Param("lastReadId") long lastReadId, @Param("channel") String channel);
}
