package edu.iastate.dashboard309.service;

import java.io.InputStreamReader;
import java.io.Reader;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import com.opencsv.CSVReader;

import edu.iastate.dashboard309.model.Role;
import edu.iastate.dashboard309.model.Team;
import edu.iastate.dashboard309.model.User;
import edu.iastate.dashboard309.repository.RoleRepository;
import edu.iastate.dashboard309.repository.TeamRepository;
import edu.iastate.dashboard309.repository.UserRepository;
import jakarta.transaction.Transactional;

@Service
public class ImportService {

    UserRepository userRepository;
    TeamRepository teamRepository;
    RoleRepository roleRepository;
    PasswordResetService passwordResetService;

    public ImportService(UserRepository userRepository, TeamRepository teamRepository, RoleRepository roleRepository, PasswordResetService passwordResetService){
        this.userRepository = userRepository;
        this.teamRepository = teamRepository;
        this.roleRepository = roleRepository;
        this.passwordResetService = passwordResetService;
    }

    Role studentRole;
    Role taRole;
    Role htaRole;

    private final int FIRST_NAME_COLUMN = 0; 
    private final int LAST_NAME_COLUMN = 1;
    private final int NETID_COLUMN = 2;
    private final int TEAM_NAME_COLUMN = 3;

    @Transactional
    public void processCSV(MultipartFile file) throws Exception{
        try {
            Reader reader = new InputStreamReader(file.getInputStream());
            CSVReader csvReader = new CSVReader(reader);

            findRoles();

            Map<String, List<User>> teamMap = new HashMap<>();
            Set<String> teamNames = new HashSet<>();
            // [first_name, last_name, net_id, team_name]
            String[] features;
            List<String> netids = new ArrayList<>();
            int row = 1;

            // Skip the header line. You can delete this if you don't have a header line
            features = csvReader.readNext();
            // Find users and put them in a list
            while((features = csvReader.readNext()) != null){
                for(int i = 0; i < features.length; i++){
                    if(features[i] == ""){
                        csvReader.close();
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Empty cell at row " + row + " column " + i);
                    }
                }
                teamMap.computeIfAbsent(features[3], k -> new ArrayList<>()).add(createStudent(features, netids));
                if(!teamNames.contains(features[3])){
                    teamNames.add(features[3]);
                }
                // Prints the features
                for(String feature : features){
                    System.out.print(feature + " ");
                }
                System.out.println();
                
                row++;
            }

            csvReader.close();

            addTeamsToDatabase(teamMap, teamNames);

        } catch (Exception e){
            throw e;
        }
    }

    @Transactional
    public void processXLSX(MultipartFile file) throws Exception{
        try {
            Workbook workbook = new XSSFWorkbook(file.getInputStream());
            Sheet sheet = workbook.getSheetAt(0);

            findRoles();

            Map<String, List<User>> teamMap = new HashMap<>();
            Set<String> teamNames = new HashSet<>();
            // [first_name, last_name, net_id, team_name]
            String[] features = new String[4];
            List<String> netids = new ArrayList<>();

            for (Row row : sheet) {
                // Skip the header line. You can delete this if you don't have a header line
                if(row.getRowNum() == 0){
                    continue;
                }
                for (int i = 0; i < features.length; i++) {
                    if(row.getCell(i) == null || row.getCell(i).getCellType() == CellType.BLANK){
                        workbook.close();
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Empty cell at row " + row.getRowNum() + " column " + i);
                    }
                    features[i] = row.getCell(i).toString();
                    
                }
                // Add the student to the teams
                teamMap.computeIfAbsent(features[TEAM_NAME_COLUMN], k -> new ArrayList<>()).add(createStudent(features, netids));
                if(!teamNames.contains(features[TEAM_NAME_COLUMN])){
                    teamNames.add(features[TEAM_NAME_COLUMN]);
                }

                // Prints the features
                for(String feature : features){
                    System.out.print(feature + " ");
                }
                System.out.println();         
            }

            workbook.close();

            addTeamsToDatabase(teamMap, teamNames);
            
        } catch (Exception e){
            throw e;
        }
    }

    @Transactional
    private void findRoles(){
        studentRole = roleRepository.findByRoleName("STUDENT")
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "\'STUDENT\' role not found"));
        taRole = roleRepository.findByRoleName("TA")
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "\'TA\' role not found"));
        htaRole = roleRepository.findByRoleName("HTA")
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "\'HTA\' role not found"));
    }

    @Transactional
    private User createStudent(String[] features, List<String> netids){
        User user = new User();
        String name = features[FIRST_NAME_COLUMN] + ' ' + features[LAST_NAME_COLUMN];
        String netid = features[NETID_COLUMN];

        // If the user already exists in the database, check if they have the student role
        if(userRepository.existsByNetid(netid)){
            User checkIfStudent = userRepository.findByNetid(netid)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "User \'" + netid + "\' already exists, but could not be found."));
            if(!checkIfStudent.getRole().contains(studentRole)){
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "User with netid \'" + netid + "\' not a student.");
            }
        }
        // If the student already exists in the spreadsheet
        if(netids.contains(netid)){
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "User with netid \'" + netid + "\' is represented multiple times."); 
        }

        // Set features
        user.setName(name);
        user.setNetid(netid);
        user.setRole(studentRole);
        // Add to netids
        netids.add(netid);

        return user;
    }

    @Transactional
    private Team createTeam(String teamName) throws Exception{
        try{
            Team team = new Team();

            String[] parts = teamName.split("_");
            if(parts.length != 3){
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid team name: " + teamName);
            }
            int section = Integer.parseInt(parts[0]);
            int teamNum = Integer.parseInt(parts[2]);
            String initials = parts[1];

            if(teamRepository.existsByName(teamName)){
                team = teamRepository.findByName(teamName)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Team \'" + teamName + "\' already exists, but could not be found."));
            }
            else{
                // Set features
                team.setName(teamName);
                team.setSection(section);

                // Find TA based on initials
                List<User> tas = userRepository.findTaByInitials(initials);
                if(tas.size() > 1){
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Multiple TAs found with initials \'"  + initials + "\'");
                }
                else if(tas.size() == 0){
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No TAs found with initials \'"  + initials + "\'");
                }
                team.setTa(tas.get(0));
            }

            return team;
        } catch(NumberFormatException e){
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid team name: " + teamName);
        } catch (Exception e){
            throw e;
        }
    }

    @Transactional
    private void addTeamsToDatabase(Map<String, List<User>> teamMap, Set<String> teamNames) throws Exception{
        try{
            Set<Team> teams = new HashSet<>();
            // Create teams
            for(String teamName : teamNames){
                Team team = createTeam(teamName);
                teams.add(team);
            }

            // Add everything to the database
            // Save teams and students
            for (Team team : teams){
                teamRepository.save(team);
                teamRepository.flush();

                List<User> students = teamMap.get(team.getName());
                for(User student : students){
                    User managedStudent;
                    boolean isNew;
                    if(userRepository.existsByNetid(student.getNetid())){
                        managedStudent = userRepository.findByNetid(student.getNetid())
                            .orElseThrow();
                        isNew = false;
                    }
                    else{
                        managedStudent = student;
                        isNew = true;
                    }
                    team.addStudent(managedStudent);
                    managedStudent.setTeam(team);
                    userRepository.save(managedStudent);
                    if (isNew) {
                        try {
                            passwordResetService.sendTemporaryPassword(managedStudent.getNetid());
                        } catch (Exception e) {
                            // account is created; email failure is non-fatal
                        }
                    }
                }
            }
        } catch(Exception e){
            throw e;
        }
    }
}
