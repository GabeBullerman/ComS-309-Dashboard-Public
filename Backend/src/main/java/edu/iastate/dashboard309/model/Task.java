package edu.iastate.dashboard309.model;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "tasks")
public class Task {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "assigned_date")
    private LocalDateTime assignedDate = LocalDateTime.now();

    @Column(name = "due_date")
    private LocalDateTime dueDate;

    @Column(name = "description")
    private String description;

    @ManyToOne
    @JoinColumn(name = "assigned_by")
    private User assignedBy;

    @ManyToOne
    @JoinColumn(name = "assigned_to")
    private User assignedTo;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public LocalDateTime getDueDate(){
        return dueDate;
    }

    public void setDueDate(LocalDateTime date){
        dueDate = date;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public User getAssignedBy(){
        return assignedBy;
    }

    public void setAssignedBy(User author){
        assignedBy = author;
    }

    public User getAssignedTo(){
        return assignedTo;
    }

    public void setAssignedTo(User reciever){
        assignedTo = reciever;
    }
}
