package edu.iastate.dashboard309.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "app_settings")
public class AppSettings {

    @Id
    @Column(name = "id")
    private Long id;

    @Column(name = "key_name", nullable = false, unique = true)
    private String keyName;

    @Column(name = "value")
    private String value;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getKeyName() { return keyName; }
    public void setKeyName(String keyName) { this.keyName = keyName; }

    public String getValue() { return value; }
    public void setValue(String value) { this.value = value; }
}
