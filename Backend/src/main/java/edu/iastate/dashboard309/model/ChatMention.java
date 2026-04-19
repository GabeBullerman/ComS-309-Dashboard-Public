package edu.iastate.dashboard309.model;

import jakarta.persistence.*;

@Entity
@Table(name = "chat_mentions")
public class ChatMention {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "message_id", nullable = false)
    private ChatMessage message;

    @Column(name = "mentioned_netid")
    private String mentionedNetid;

    @Column(name = "mentioned_role")
    private String mentionedRole;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public ChatMessage getMessage() { return message; }
    public void setMessage(ChatMessage message) { this.message = message; }
    public String getMentionedNetid() { return mentionedNetid; }
    public void setMentionedNetid(String mentionedNetid) { this.mentionedNetid = mentionedNetid; }
    public String getMentionedRole() { return mentionedRole; }
    public void setMentionedRole(String mentionedRole) { this.mentionedRole = mentionedRole; }
}
