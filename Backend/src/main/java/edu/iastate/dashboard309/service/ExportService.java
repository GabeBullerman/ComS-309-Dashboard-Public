package edu.iastate.dashboard309.service;

import jakarta.transaction.Transactional;

import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.xssf.usermodel.XSSFCellStyle;
import org.apache.poi.xssf.usermodel.XSSFColor;
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
    private final int TEAM_FEATURES = 20;

    private final int TEAM_NAME_INDEX_START = 0;
    private final int TEAM_NAME_INDEX_END = 1;
    private final int TEAM_NETID_INDEX = 2;
    private final int TEAM_ATTENDANCE_INDEX_START = 3;
    private final int TEAM_ATTENDANCE_INDEX_END = 7;
    private final int TEAM_DEMO_INDEX_START = 8;
    private final int TEAM_DEMO_INDEX_END = 19;

    private final String[] teamHeader = new String[]{"first_name", "last_name", "netid", "attendance", "present", "late", "absent", "excused", "demo 1", "code", "teamwork", "demo 2", "code", "teamwork", "demo 3", "code", "teamwork", "demo 4", "code", "teamwork"};
    private final String[] studentHeader = new String[]{"first_name", "last_name", "netid", "team_name"};

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
        XSSFWorkbook workbook = new XSSFWorkbook();
        List<TeamRequest> teams = teamService.getAllTeams();

        for(TeamRequest team : teams){
            XSSFSheet sheet = createTeamSheet(workbook, team);    
        }

        return workbook;
    }


    private XSSFSheet createTeamSheet(XSSFWorkbook workbook, TeamRequest team){
        XSSFSheet sheet = workbook.createSheet(team.name());
        String[] studentData = new String[TEAM_FEATURES];

        // Header row
        XSSFRow headerRow = sheet.createRow(0);
        for(int i = 0; i < teamHeader.length; i++){
            headerRow.createCell(i).setCellValue(teamHeader[i]);
        }

        // Fill in the data
        List<UserRequest> students = team.students();
        int rowNum = 1;

        // Cell colors
        XSSFCellStyle red = workbook.createCellStyle();
        red.setFillForegroundColor(IndexedColors.RED.getIndex());
        red.setFillPattern(FillPatternType.SOLID_FOREGROUND);

        XSSFCellStyle yellow = workbook.createCellStyle();
        yellow.setFillForegroundColor(IndexedColors.YELLOW.getIndex());
        yellow.setFillPattern(FillPatternType.SOLID_FOREGROUND);

        XSSFCellStyle green = workbook.createCellStyle();
        green.setFillForegroundColor(IndexedColors.GREEN.getIndex());
        green.setFillPattern(FillPatternType.SOLID_FOREGROUND);

        XSSFCellStyle gray = workbook.createCellStyle();
        gray.setFillForegroundColor(new XSSFColor(new byte[]{(byte) 128, (byte) 128, (byte) 128}));
        gray.setFillPattern(FillPatternType.SOLID_FOREGROUND);

        for(UserRequest student : students){
            studentData = getStudentData(student);
            XSSFRow row = sheet.createRow(rowNum);

            for(int i = 0; i < studentData.length; i++){
                // Attendance section
                if(i > TEAM_ATTENDANCE_INDEX_START && i <= TEAM_ATTENDANCE_INDEX_END){
                    row.createCell(i).setCellValue(Double.parseDouble(studentData[i]));
                }
                // Demo performance section
                else if(i >= TEAM_DEMO_INDEX_START && i <= TEAM_DEMO_INDEX_END){
                    int skip = (i - TEAM_DEMO_INDEX_START) % 3;
                    if(skip == 0){}
                    // Poor
                    else if(studentData[i] == "0"){
                        row.createCell(i).setCellStyle(red);
                    }
                    // Ok
                    else if(studentData[i] == "1"){
                        row.createCell(i).setCellStyle(yellow);
                    }
                    // Great
                    else if(studentData[i] == "2"){
                        row.createCell(i).setCellStyle(green);
                    }
                    // Unassigned
                    else{
                        row.createCell(i).setCellStyle(gray);
                    }
                }
                else{
                    row.createCell(i).setCellValue(studentData[i]);
                }
            }

            rowNum++;
        }

        // Weekly performance

        return sheet;
    }

    private String[] getStudentData(UserRequest student){
        String[] data = new String[TEAM_FEATURES];

        // Index out of bound error: index 1 for length 1
        String[] name = student.name().split(" ", 2);
        String netid = student.netid();
        data[0] = name[0];
        data[1] = name[1];
        data[2] = netid;
        // Empty for "Attendance"
        data[3] = "";

        List<Long> attendanceCounts = attendanceService.getAttendanceCountByStudentNetid(netid);
        for(int i = 0; i < attendanceCounts.size(); i++){
            data[i + TEAM_ATTENDANCE_INDEX_START + 1] = attendanceCounts.get(i).toString();
        }

        for(int i = 0; i < 4; i++){
            // Empty for "Demo #"
            data[(i * 3) + TEAM_DEMO_INDEX_START] = "";

            // Get demo results for i+1
            DemoPerformanceRequest demo = demoPerformanceService.getDemoPerformanceByStudentIdAndDemoNumber(netid, i+1);
            for(int j = 0; j < 2; j++){
                int index = (i * 3) + TEAM_DEMO_INDEX_START + j + 1;

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
