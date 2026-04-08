package edu.iastate.dashboard309.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "weekly_performance")
public class WeeklyPerformance {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @ManyToOne
    @JoinColumn(name = "student_id", nullable = false)
    private User student;

    @Column(name = "code_score", nullable = false)
    private Integer codeScore;

    @Column(name = "teamwork_score", nullable = false)
    private Integer teamworkScore;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public User getStudent() {
        return student;
    }

    public void setStudent(User student) {
        this.student = student;
    }

    public Integer getCodeScore() {
        return codeScore;
    }

    public void setCodeScore(Integer codeScore) {
        this.codeScore = codeScore;
    }

    public Integer getTeamworkScore() {
        return teamworkScore;
    }

    public void setTeamworkScore(Integer teamworkScore) {
        this.teamworkScore = teamworkScore;
    }
}
