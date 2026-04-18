package edu.iastate.dashboard309.repository;

import edu.iastate.dashboard309.model.ChatMessage;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    @Query("SELECT m FROM ChatMessage m ORDER BY m.id DESC")
    List<ChatMessage> findLatest(Pageable pageable);

    @Query("SELECT m FROM ChatMessage m WHERE m.id < :before ORDER BY m.id DESC")
    List<ChatMessage> findBefore(@Param("before") Long before, Pageable pageable);

    /**
     * Count messages that are relevant to this user (tag notifications):
     *  - @netid mention
     *  - @role mention matching the user's role
     *  - a reply to a message the user sent
     * Excludes messages the user sent themselves and messages already seen (id <= lastReadId).
     */
    @Query("""
        SELECT COUNT(m) FROM ChatMessage m
        WHERE m.id > :lastReadId
          AND m.senderNetid != :netid
          AND (
            EXISTS (SELECT 1 FROM ChatMention cm WHERE cm.message = m AND cm.mentionedNetid = :netid)
            OR EXISTS (SELECT 1 FROM ChatMention cm WHERE cm.message = m AND LOWER(cm.mentionedRole) = LOWER(:role))
            OR EXISTS (SELECT 1 FROM ChatMessage parent WHERE parent = m.replyTo AND parent.senderNetid = :netid)
          )
        """)
    long countTagsAfter(@Param("netid") String netid, @Param("role") String role, @Param("lastReadId") long lastReadId);
}
