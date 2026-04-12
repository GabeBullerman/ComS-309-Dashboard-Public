package edu.iastate.dashboard309.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "at_risk_override")
public class AtRiskOverride {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "student_netid", nullable = false)
    private String studentNetid;

    @Column(name = "reason", nullable = false, length = 500)
    private String reason;

    @Column(name = "flagged_by_netid", nullable = false)
    private String flaggedByNetid;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getStudentNetid() { return studentNetid; }
    public void setStudentNetid(String studentNetid) { this.studentNetid = studentNetid; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public String getFlaggedByNetid() { return flaggedByNetid; }
    public void setFlaggedByNetid(String flaggedByNetid) { this.flaggedByNetid = flaggedByNetid; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
