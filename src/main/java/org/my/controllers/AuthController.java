package org.my.controllers;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import java.security.Principal;
import java.util.Map;

@RestController
public class AuthController {
    @GetMapping("/init")
    public Map<String, Boolean> init(Principal principal) {
        return Map.of("result", principal != null);
    }
}
