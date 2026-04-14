package edu.iastate.dashboard309.controller;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import edu.iastate.dashboard309.service.ImportService;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;


@RestController
@RequestMapping("/api/import")
public class ImportController {

    private final ImportService importService;

    public ImportController(ImportService importService){
        this.importService = importService;
    }

    @PreAuthorize("hasAuthority('CAN_IMPORT')")
    @PostMapping("")
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
    
}
