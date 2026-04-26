package edu.iastate.dashboard309.model;

import jakarta.persistence.*;

@Entity
@Table(name = "chat_reactions", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"message_id", "emoji", "user_netid"})
})
public class ChatReaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "message_id", nullable = false)
    private ChatMessage message;

    @Column(name = "emoji", nullable = false, length = 10)
    private String emoji;

    @Column(name = "user_netid", nullable = false)
    private String userNetid;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public ChatMessage getMessage() { return message; }
    public void setMessage(ChatMessage message) { this.message = message; }
    public String getEmoji() { return emoji; }
    public void setEmoji(String emoji) { this.emoji = emoji; }
    public String getUserNetid() { return userNetid; }
    public void setUserNetid(String userNetid) { this.userNetid = userNetid; }
}
