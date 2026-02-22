package edu.iastate.dashboard309.model;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;

@Entity
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "netid", nullable = false, unique = true)
    private String netid;

    @Column(name = "password", nullable = false)
    private String password;

    @ManyToMany
    @Column(name = "roles")
    @JoinTable(
        name = "user_roles",
        joinColumns = @JoinColumn(name = "user_id"),
        inverseJoinColumns = @JoinColumn(name = "role_id")
    )
    private Set<Role> roles = new HashSet<>();;

    @ManyToOne
    @JoinColumn(name = "team_id")
    private Team team;

    @OneToMany(mappedBy = "ta")
    private Set<Team> managedTeams;

    @OneToMany(mappedBy = "assignedTo")
    private Set<Task> assignedTasks;

    @OneToMany(mappedBy = "assignedBy")
    private Set<Task> createdTasks;

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

    public String getNetid() {
        return netid;
    }

    public String getUsername(){
        return netid;
    }

    public void setNetid(String netid) {
        this.netid = netid;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public Set<Role> getRole(){
        return roles;
    }

    public List<String> getRoleNames(){
        List<String> roleNames = new ArrayList<String>();
        for(Role role : roles){
            roleNames.add(role.getRoleName());
        }
        return roleNames;
    }

    public void setRole(Role role){
        roles.add(role);
    }

    public Set<String> getPermissions(){
        Set<String> permissions = new HashSet<>();
        Set<Role> roles = getRole();
        for(Role role : roles){
            for(String p : role.getPermissionNames()){
                if(!permissions.contains(p)){
                    permissions.add(p);
                }
            }
        }
        return permissions;
    }

    public void setTeam(Team team){
        this.team = team;
    }

    public Team getTeam() {
        return team;
    }
}
