package edu.iastate.dashboard309.model;

import java.util.Date;
import java.util.UUID;

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

    // Token stored in database is hashed
    @Column(name = "token_hash", nullable = false, length = 512)
    private String tokenHash;

    @Column(name = "created_at", nullable = false)
    private Date createdAt;

    @Column(name = "expires_at", nullable = false)
    private Date expiresAt;

    @Column(name = "used")
    private boolean used = false;

    @Column(name = "revoked")
    private boolean revoked = false;


    public UUID getId(){
        return id;
    }

    public void setId(UUID id){
        this.id = id;
    }

    public User getUser(){
        return user;
    }

    public void setUser(User user){
        this.user = user;
    }

    public String getTokenHash(){
        return tokenHash;
    }

    public void setToken(String token){
        tokenHash = token;
    }

    public Date getCreatedAt(){
        return createdAt;
    }

    public void setCreatedAt(Date date){
        createdAt = date;
    }

    public Date getExpiresAt(){
        return expiresAt;
    }

    public void setExpiresAt(Date date){
        expiresAt = date;
    }

    public boolean isUsed(){
        return used;
    }

    public void setUsed(boolean b){
        used = b;
    }

    public boolean isRevoked(){
        return revoked;
    }

    public void setRevoked(boolean b){
        revoked = b;
    }
}
