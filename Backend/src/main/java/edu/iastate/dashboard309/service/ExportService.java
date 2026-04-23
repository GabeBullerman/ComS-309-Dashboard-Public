package edu.iastate.dashboard309.service;

import jakarta.transaction.Transactional;

import java.io.IOException;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.apache.poi.common.usermodel.HyperlinkType;
import org.apache.poi.ss.usermodel.BorderStyle;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.xssf.usermodel.XSSFCellStyle;
import org.apache.poi.xssf.usermodel.XSSFColor;
import org.apache.poi.xssf.usermodel.XSSFCreationHelper;
import org.apache.poi.xssf.usermodel.XSSFFont;
import org.apache.poi.xssf.usermodel.XSSFHyperlink;
import org.apache.poi.xssf.usermodel.XSSFRow;
import org.apache.poi.xssf.usermodel.XSSFSheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import edu.iastate.dashboard309.dto.DemoPerformanceRequest;
import edu.iastate.dashboard309.dto.TeamRequest;
import edu.iastate.dashboard309.dto.UserRequest;
import edu.iastate.dashboard309.dto.WeeklyPerformanceRequest;

@Service
public class ExportService {

    private final WeeklyPerformanceService weeklyPerformanceService;

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

    private final int NUM_WEEKS = 16;

    private final int TEAM_FEATURES = 20;

    private final int TEAM_NAME_INDEX_START = 0;
    private final int TEAM_NAME_INDEX_END = 1;
    private final int TEAM_NETID_INDEX = 2;
    private final int TEAM_ATTENDANCE_INDEX_START = 3;
    private final int TEAM_ATTENDANCE_INDEX_END = 7;
    private final int TEAM_DEMO_INDEX_START = 8;
    private final int TEAM_DEMO_INDEX_END = 19;

    private final String[] teamHeader = new String[]{"first_name", "last_name", "netid", "attendance", "present", "late", "absent", "excused", "demo 1", "code", "teamwork", "demo 2", "code", "teamwork", "demo 3", "code", "teamwork", "demo 4", "code", "teamwork"};
    
    private final int STUDENT_FEATURES = 4;

    private final int STUDENT_NAME_INDEX_START = 0;
    private final int STUDENT_NAME_INDEX_END = 1;
    private final int STUDENT_NETID_INDEX = 2;
    private final int STUDENT_TEAM_NAME_INDEX = 3;
    private final String[] studentHeader = new String[]{"first_name", "last_name", "netid", "team_name"};

    private final TeamService teamService;
    private final AttendanceService attendanceService;
    private final DemoPerformanceService demoPerformanceService;

    public ExportService(TeamService teamService, AttendanceService attendanceService, DemoPerformanceService demoPerformanceService, WeeklyPerformanceService weeklyPerformanceService){
        this.teamService = teamService;
        this.attendanceService = attendanceService;
        this.demoPerformanceService = demoPerformanceService;
        this.weeklyPerformanceService = weeklyPerformanceService;
    }

    // Cell colors
    XSSFCellStyle red;
    XSSFCellStyle yellow;
    XSSFCellStyle green;
    XSSFCellStyle gray;
    XSSFCellStyle link;

    // Puts all teams currently in the database into a .xlsx
    @Transactional
    public XSSFWorkbook exportXLSX() throws IOException{
        XSSFWorkbook workbook = new XSSFWorkbook();
        XSSFCreationHelper helper = workbook.getCreationHelper();
        loadStyles(workbook);

        XSSFSheet studentSheet = workbook.createSheet("Students");
        // Header row
        int rowNum = 0;
        XSSFRow studentHeaderRow = studentSheet.createRow(rowNum);
        for(int i = 0; i < studentHeader.length; i++){
            studentHeaderRow.createCell(i).setCellValue(studentHeader[i]);
        }
        rowNum++;

        List<TeamRequest> teams = teamService.getAllTeams();
        for(TeamRequest team : teams){
            XSSFSheet teamSheet = createTeamSheet(workbook, team);   
            List<UserRequest> students = team.students(); 
            for(UserRequest student : students){
                // Add the student to the studentSheet
                XSSFRow studentRow = studentSheet.createRow(rowNum);
                String[] name = student.name().split(" ", 2);
                studentRow.createCell(STUDENT_NAME_INDEX_START).setCellValue(name[0]);
                studentRow.createCell(STUDENT_NAME_INDEX_END).setCellValue(name[1]);
                studentRow.createCell(STUDENT_NETID_INDEX).setCellValue(student.netid());
                studentRow.createCell(STUDENT_TEAM_NAME_INDEX).setCellValue(team.name());

                // Add links to the team sheet
                XSSFHyperlink hyperlink = helper.createHyperlink(HyperlinkType.DOCUMENT);
                hyperlink.setAddress("\'" + team.name() + "\'!A1");
                studentRow.getCell(STUDENT_TEAM_NAME_INDEX).setHyperlink(hyperlink);
                studentRow.getCell(STUDENT_TEAM_NAME_INDEX).setCellStyle(link);
                rowNum++;
            }
        }

        return workbook;
    }

    private XSSFSheet createTeamSheet(XSSFWorkbook workbook, TeamRequest team){
        XSSFSheet sheet = workbook.createSheet(team.name());
        String[] studentData = new String[TEAM_FEATURES];

        // Header row
        XSSFRow headerRow1 = sheet.createRow(0);
        for(int i = 0; i < teamHeader.length; i++){
            headerRow1.createCell(i).setCellValue(teamHeader[i]);
        }

        // Fill in the data
        List<UserRequest> students = team.students();
        int rowNum = 1;

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
                    else if(studentData[i].equals("0")){
                        row.createCell(i).setCellStyle(red);
                    }
                    // Ok
                    else if(studentData[i].equals("1")){
                        row.createCell(i).setCellStyle(yellow);
                    }
                    // Great
                    else if(studentData[i].equals("2")){
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

        // TODO: The first week is decided by earliest WeeklyPerformance in the team, not when the semester starts.
        // Weekly performance section
        // Get the performances of all students
        Map<Long, List<WeeklyPerformanceRequest>> performanceMap = new HashMap<>();
        LocalDate earliest = null;
        for(UserRequest student : students){
            List<WeeklyPerformanceRequest> performance = new ArrayList<>(weeklyPerformanceService.getWeeklyPerformanceByStudentNetid(student.netid()));
            if(!performance.isEmpty()){
                Collections.sort(performance);
                if(earliest == null || performance.get(0).weekStartDate().compareTo(earliest) < 0){
                    earliest = performance.get(0).weekStartDate();
                }
                performanceMap.put(student.id(), performance);
            }
        }

        // If there are no weekly performances, skip
        if(earliest == null){
            return sheet;
        }

        // Header row
        rowNum += 2;
        XSSFRow headerRow2 = sheet.createRow(rowNum);
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("MM/dd");
        headerRow2.createCell(0).setCellValue("Weekly Performance");
        for(int i = 0; i < NUM_WEEKS; i++){
            headerRow2.createCell(i+3).setCellValue(earliest.plusWeeks(i).format(formatter));
        }
        rowNum++;

        // Fill in weekly performance for all students
        for(UserRequest student : students){
            // Create rows
            XSSFRow codePerformanceRow = sheet.createRow(rowNum);
            XSSFRow teamworkPerformanceRow = sheet.createRow(rowNum+1);
            rowNum += 3;

            // Fill identifying information
            codePerformanceRow.createCell(0).setCellValue(student.name()); // Name
            codePerformanceRow.createCell(2).setCellValue("Code");

            teamworkPerformanceRow.createCell(0).setCellValue(student.netid()); // Netid
            teamworkPerformanceRow.createCell(2).setCellValue("Teamwork");

            // Fill in performances
            List<WeeklyPerformanceRequest> performances = performanceMap.get(student.id());
            WeeklyPerformanceRequest performance;
            int index = 0;
            for(int i = 0; i < NUM_WEEKS; i++){
                LocalDate date = earliest.plusWeeks(i);

                // Check if there is data for performance that week, or if we iterated through the entire list
                if(performances != null && index < performances.size() && performances.get(index).weekStartDate().equals(date)){
                    performance = performances.get(index);
                    index++;
                }
                // No performance data for that week
                else{
                    codePerformanceRow.createCell(i+3).setCellStyle(gray);
                    teamworkPerformanceRow.createCell(i+3).setCellStyle(gray);
                    continue;
                }

                // Set code row
                int code = performance.codeScore();
                if(code == 0){
                    codePerformanceRow.createCell(i+3).setCellStyle(red);
                }
                else if(code == 1){
                    codePerformanceRow.createCell(i+3).setCellStyle(yellow);
                }
                else if(code == 2){
                    codePerformanceRow.createCell(i+3).setCellStyle(green);
                }
                else{
                    codePerformanceRow.createCell(i+3).setCellStyle(gray);
                }

                // Set teamwork row
                int teamwork = performance.teamworkScore();
                if(teamwork == 0){
                    teamworkPerformanceRow.createCell(i+3).setCellStyle(red);
                }
                else if(teamwork == 1){
                    teamworkPerformanceRow.createCell(i+3).setCellStyle(yellow);
                }
                else if(teamwork == 2){
                    teamworkPerformanceRow.createCell(i+3).setCellStyle(green);
                }
                else{
                    teamworkPerformanceRow.createCell(i+3).setCellStyle(gray);
                }
            }
        }

        return sheet;
    }

    private String[] getStudentData(UserRequest student){
        String[] data = new String[TEAM_FEATURES];

        // Split into first and last name
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
                    //System.out.println("Code score: " + data[index] + " at index " + index);
                }
                // Teamwork
                else{
                    data[index] = demo.teamworkScore().toString();
                    //System.out.println("Teamwork score: " + data[index] + " at index " + index);
                }
            }
        }

        return data;
    }

    private void loadStyles(XSSFWorkbook workbook){
        // Set cell colors
        red = workbook.createCellStyle();
        red.setFillForegroundColor(IndexedColors.RED.getIndex());
        red.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        red.setBorderTop(BorderStyle.THIN);
        red.setBorderBottom(BorderStyle.THIN);
        red.setBorderLeft(BorderStyle.THIN);
        red.setBorderRight(BorderStyle.THIN);

        yellow = workbook.createCellStyle();
        yellow.setFillForegroundColor(IndexedColors.YELLOW.getIndex());
        yellow.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        yellow.setBorderTop(BorderStyle.THIN);
        yellow.setBorderBottom(BorderStyle.THIN);
        yellow.setBorderLeft(BorderStyle.THIN);
        yellow.setBorderRight(BorderStyle.THIN);

        green = workbook.createCellStyle();
        green.setFillForegroundColor(IndexedColors.GREEN.getIndex());
        green.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        green.setBorderTop(BorderStyle.THIN);
        green.setBorderBottom(BorderStyle.THIN);
        green.setBorderLeft(BorderStyle.THIN);
        green.setBorderRight(BorderStyle.THIN);

        gray = workbook.createCellStyle();
        gray.setFillForegroundColor(new XSSFColor(new byte[]{(byte) 128, (byte) 128, (byte) 128}));
        gray.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        gray.setBorderTop(BorderStyle.THIN);
        gray.setBorderBottom(BorderStyle.THIN);
        gray.setBorderLeft(BorderStyle.THIN);
        gray.setBorderRight(BorderStyle.THIN);

        link = workbook.createCellStyle();
        XSSFFont linkFont = workbook.createFont();
        linkFont.setUnderline(Font.U_SINGLE);
        linkFont.setColor(IndexedColors.BLUE.getIndex());
        link.setFont(linkFont);
    }
}
