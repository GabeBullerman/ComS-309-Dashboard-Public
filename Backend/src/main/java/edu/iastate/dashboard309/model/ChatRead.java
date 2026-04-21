package edu.iastate.dashboard309.model;

import jakarta.persistence.*;

@Entity
@Table(name = "chat_reads")
public class ChatRead {

    /** Composite surrogate: "netid:channelName" */
    @Id
    @Column(name = "id")
    private String id;

    @Column(name = "netid", nullable = false)
    private String netid;

    @Column(name = "channel_name", nullable = false)
    private String channelName;

    @Column(name = "last_read_message_id")
    private Long lastReadMessageId;

    public static String makeId(String netid, String channelName) {
        return netid + ":" + channelName;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getNetid() { return netid; }
    public void setNetid(String netid) { this.netid = netid; }
    public String getChannelName() { return channelName; }
    public void setChannelName(String channelName) { this.channelName = channelName; }
    public Long getLastReadMessageId() { return lastReadMessageId; }
    public void setLastReadMessageId(Long lastReadMessageId) { this.lastReadMessageId = lastReadMessageId; }
}
