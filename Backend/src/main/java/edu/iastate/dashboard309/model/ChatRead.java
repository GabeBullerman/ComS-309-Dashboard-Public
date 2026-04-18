package edu.iastate.dashboard309.model;

import jakarta.persistence.*;

@Entity
@Table(name = "chat_reads")
public class ChatRead {

    @Id
    @Column(name = "netid")
    private String netid;

    @Column(name = "last_read_message_id")
    private Long lastReadMessageId;

    public String getNetid() { return netid; }
    public void setNetid(String netid) { this.netid = netid; }
    public Long getLastReadMessageId() { return lastReadMessageId; }
    public void setLastReadMessageId(Long lastReadMessageId) { this.lastReadMessageId = lastReadMessageId; }
}
