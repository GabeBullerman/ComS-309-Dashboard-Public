package edu.iastate.dashboard309.model;

import java.util.Set;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;

@Entity
@Table(name = "teams")
public class Team {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Long id;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "section")
    private Integer section;

    @ManyToOne
    @JoinColumn(name = "ta_id")
    private User ta;

    @OneToMany(mappedBy = "team")
    private Set<User> students;

    @Column(name = "status")
    private Integer status;

    @Column(name = "ta_notes")
    private String taNotes;

    @Column(name = "gitlab")
    private String gitlab;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public Integer getSection() {
        return section;
    }

    public void setSection(Integer section) {
        this.section = section;
    }

    public User getTa() {
        return ta;
    }

    public void setTa(User newTa) {
        this.ta = newTa;
    }

    public Set<User> getStudents(){
        return students;
    }

    public void addStudent(User student){
        students.add(student);
    }

    public void removeStudent(User student){
        students.remove(student);
    }

    public Integer getStatus() {
        return status;
    }

    public void setStatus(Integer status) {
        this.status = status;
    }

    public String getTaNotes() {
        return taNotes;
    }

    public void setTaNotes(String taNotes) {
        this.taNotes = taNotes;
    }

    public String getGitlab() {
        return gitlab;
    }

    public void setGitlab(String gitlab) {
        this.gitlab = gitlab;
    }
}
