package edu.iastate.dashboard309.authentication;

import java.util.Date;
import java.util.UUID;

import edu.iastate.dashboard309.model.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "refresh_tokens")
public class RefreshToken {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "token_hash", nullable = false, length = 512)
    private String tokenHash;

    @Column(name = "created_at", nullable = false)
    private Date createdAt;

    @Column(name = "expires_at", nullable = false)
    private Date expiresAt;

    @Column(name = "used")
    private boolean used;

    @Column(name = "revoked")
    private boolean revoked;
}
