package edu.iastate.dashboard309.service;

import jakarta.transaction.Transactional;

import java.io.IOException;
import java.util.List;

import org.apache.poi.xssf.usermodel.XSSFRow;
import org.apache.poi.xssf.usermodel.XSSFSheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import edu.iastate.dashboard309.dto.DemoPerformanceRequest;
import edu.iastate.dashboard309.dto.TeamRequest;
import edu.iastate.dashboard309.dto.UserRequest;

@Service
public class ExportService {

    /*
        0: First name
        1: Last name
        2: Netid
        3: Attendance
        4: # days present
        5: # days tardy
        6: # days absent
        7: # days excused
        8: Demo 1
        9: Code
        10: Teamwork
        11: Demo 2
        12: Code
        13: Teamwork
        14: Demo 3
        15: Code
        16: Teamwork
        17: Demo 4
        18: Code
        19: Teamwork
    */
    private final int NUM_FEATURES = 20;
    private final String[] header = new String[]{"First_name", "Last_name", "Netid", "Attendance", "Present", "Late", "Absent", "Excused", "Demo 1", "Code", "Teamwork", "Demo 2", "Code", "Teamwork", "Demo 3", "Code", "Teamwork", "Demo 4", "Code", "Teamwork"};

    private final TeamService teamService;
    private final AttendanceService attendanceService;
    private final DemoPerformanceService demoPerformanceService;

    public ExportService(TeamService teamService, AttendanceService attendanceService, DemoPerformanceService demoPerformanceService){
        this.teamService = teamService;
        this.attendanceService = attendanceService;
        this.demoPerformanceService = demoPerformanceService;
    }

    // Puts all teams currently in the database into a .xlsx
    @Transactional
    public XSSFWorkbook exportXLSX() throws IOException{
        try(XSSFWorkbook workbook = new XSSFWorkbook()){
            List<TeamRequest> teams = teamService.getAllTeams();

            for(TeamRequest team : teams){
                XSSFSheet sheet = createTeamSheet(workbook, team);
            }

            return workbook;
        } catch (IOException e){
            throw e;
        }
    }

    private XSSFSheet createTeamSheet(XSSFWorkbook workbook, TeamRequest team){
        XSSFSheet sheet = workbook.createSheet(team.name());
        String[] studentData = new String[NUM_FEATURES];

        // Header row
        XSSFRow headerRow = sheet.createRow(0);
        for(int i = 0; i < header.length; i++){
            headerRow.createCell(i).setCellValue(header[i]);
        }

        // Fill in the data
        List<UserRequest> students = team.students();
        int rowNum = 1;
        for(UserRequest student : students){
            studentData = getStudentData(student);
            XSSFRow row = sheet.createRow(rowNum);
            for(int i = 0; i < studentData.length; i++){
                row.createCell(i).setCellValue(studentData[i]);
            }
            rowNum++;
        }

        return sheet;
    }

    private String[] getStudentData(UserRequest student){
        String[] data = new String[NUM_FEATURES];

        String[] name = student.name().split(" ", 1);
        String netid = student.netid();
        data[0] = name[0];
        data[1] = name[1];
        data[2] = netid;
        // Empty for "Attendance"
        data[3] = "";

        List<Long> attendanceCounts = attendanceService.getAttendanceCountByStudentNetid(netid);
        for(int i = 0; i < attendanceCounts.size(); i++){
            data[i + 4] = attendanceCounts.get(i).toString();
        }

        final int DEMO_INDEX = 8;

        for(int i = 0; i < 4; i++){
            // Empty for "Demo #"
            data[(i * 3) + DEMO_INDEX] = "";

            // Get demo results for i+1
            DemoPerformanceRequest demo = demoPerformanceService.getDemoPerformanceByStudentIdAndDemoNumber(netid, i+1);
            for(int j = 0; j < 2; j++){
                int index = (i * 3) + DEMO_INDEX + j + 1;

                // If the demo is null
                if(demo == null){
                    data[index] = "Unassigned";
                    continue;
                }

                // Code
                if(j == 0){
                    data[index] = demo.codeScore().toString();
                }
                // Teamwork
                else{
                    data[index] = demo.teamworkScore().toString();
                }
            }
        }

        return data;
    }
}
