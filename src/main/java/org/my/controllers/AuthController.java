package org.my.controllers;
import org.my.services.ChatUserService;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import java.security.Principal;
import java.util.Map;

@RestController
public class AuthController {
    private final ChatUserService chatUserService;

    public AuthController(ChatUserService chatUserService) {
        this.chatUserService = chatUserService;
    }

    @GetMapping("/init")
    public Map<String, Boolean> init(Principal principal) {
        return Map.of("result", principal != null);
    }

    @PostMapping("/register")
    public ResponseEntity<Void> register(@RequestParam String name, @RequestParam String password) {
        chatUserService.registerUser(name, password);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> invalidRegistration(IllegalArgumentException exception) {
        return ResponseEntity.badRequest().body(Map.of("message", exception.getMessage()));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, String>> nameUnavailable() {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(Map.of("message", "This name is unavailable. Choose another name."));
    }
}
