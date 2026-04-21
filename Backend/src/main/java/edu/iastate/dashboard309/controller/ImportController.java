package edu.iastate.dashboard309.controller;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import edu.iastate.dashboard309.service.ExportService;
import edu.iastate.dashboard309.service.ImportService;

import java.io.ByteArrayOutputStream;
import java.io.IOException;

import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;


@RestController
@RequestMapping("/api/file")
public class ImportController {

    private final ImportService importService;
    private final ExportService exportService;

    public ImportController(ImportService importService, ExportService exportService){
        this.importService = importService;
        this.exportService = exportService;
    }

    @PreAuthorize("hasAuthority('CAN_IMPORT')")
    @PostMapping("/import")
    public ResponseEntity<String> processImportFile(@RequestParam("file") MultipartFile file) {
        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().body("File is empty");
        }

        try{
            String fileName = file.getOriginalFilename();

            if(fileName.endsWith(".csv")){
                importService.processCSV(file);
            }
            else if(fileName.endsWith(".xlsx")){
                importService.processXLSX(file);
            }
            else{
                return ResponseEntity.badRequest().body("Unsupported file type");
            }

            return ResponseEntity.ok("File processed successfully");

        } catch(Exception e){
            return ResponseEntity.internalServerError()
                .body(e.getMessage());
        }
    }
    
    @GetMapping("/export")
    public ResponseEntity<byte[]> exportFile(){
        try(XSSFWorkbook workbook = exportService.exportXLSX()) {
            ByteArrayOutputStream bos = new ByteArrayOutputStream();
            workbook.write(bos);

            return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=data.xlsx")
                .header(HttpHeaders.CONTENT_TYPE,
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
                .body(bos.toByteArray());
        } catch (IOException e) {
            e.printStackTrace();
            
            return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(null);
        }
    }
}
