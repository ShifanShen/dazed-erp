package com.example.dazederp.api;

import com.example.dazederp.service.FileStorageService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Path;

@RestController
@RequestMapping("/api/upload")
public class FileUploadController {
    private final FileStorageService fileStorage;
    private final String urlPrefix;

    public FileUploadController(FileStorageService fileStorage,
                               @Value("${dazed.erp.upload.url-prefix:/uploads}") String urlPrefix) {
        this.fileStorage = fileStorage;
        this.urlPrefix = urlPrefix;
    }

    @PostMapping("/image")
    public UploadResponse uploadImage(@RequestParam("file") MultipartFile file) throws IOException {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("File is empty");
        }
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new IllegalArgumentException("File must be an image");
        }
        String filename = fileStorage.storeFile(file);
        return new UploadResponse(filename, urlPrefix + "/" + filename);
    }

    @GetMapping("/{filename:.+}")
    public ResponseEntity<Resource> getFile(@PathVariable String filename) {
        try {
            Path filePath = fileStorage.loadFile(filename);
            Resource resource = new UrlResource(filePath.toUri());
            if (resource.exists() && resource.isReadable()) {
                String contentType = "application/octet-stream";
                try {
                    contentType = java.nio.file.Files.probeContentType(filePath);
                    if (contentType == null) contentType = "application/octet-stream";
                } catch (IOException ignored) {}
                return ResponseEntity.ok()
                        .contentType(MediaType.parseMediaType(contentType))
                        .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename + "\"")
                        .body(resource);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    public record UploadResponse(String filename, String url) {}
}
