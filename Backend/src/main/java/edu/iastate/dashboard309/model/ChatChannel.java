package edu.iastate.dashboard309.model;

import jakarta.persistence.*;

@Entity
@Table(name = "chat_channels")
public class ChatChannel {

    @Id
    @Column(name = "id")
    private String id;

    @Column(name = "display_name", nullable = false)
    private String displayName;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    public ChatChannel() {}

    public ChatChannel(String id, String displayName, String description) {
        this.id = id;
        this.displayName = displayName;
        this.description = description;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getDisplayName() { return displayName; }
    public void setDisplayName(String displayName) { this.displayName = displayName; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
}
