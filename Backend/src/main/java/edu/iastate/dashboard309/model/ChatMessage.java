package edu.iastate.dashboard309.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "chat_messages")
public class ChatMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "sender_netid", nullable = false)
    private String senderNetid;

    @Column(name = "sender_name")
    private String senderName;

    @Column(name = "content", nullable = false, columnDefinition = "TEXT")
    private String content;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reply_to_id")
    private ChatMessage replyTo;

    @Column(name = "edited", nullable = false)
    private boolean edited = false;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "channel_name", nullable = false)
    private String channelName = "general";

    @OneToMany(mappedBy = "message", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private List<ChatMention> mentions = new ArrayList<>();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getSenderNetid() { return senderNetid; }
    public void setSenderNetid(String senderNetid) { this.senderNetid = senderNetid; }
    public String getSenderName() { return senderName; }
    public void setSenderName(String senderName) { this.senderName = senderName; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public ChatMessage getReplyTo() { return replyTo; }
    public void setReplyTo(ChatMessage replyTo) { this.replyTo = replyTo; }
    public boolean isEdited() { return edited; }
    public void setEdited(boolean edited) { this.edited = edited; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
    public String getChannelName() { return channelName; }
    public void setChannelName(String channelName) { this.channelName = channelName; }
    public List<ChatMention> getMentions() { return mentions; }
    public void setMentions(List<ChatMention> mentions) { this.mentions = mentions; }
}
