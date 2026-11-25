package org.my.controllers;
import lombok.RequiredArgsConstructor;
import org.my.services.ChatPasswordService;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.SessionAttribute;
import java.security.Principal;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class AuthController {
    private final ChatPasswordService chatPasswordService;

    @GetMapping("/init")
    public Map<String, Boolean> init(Principal principal) {
        return Map.of("result", principal != null);
    }

    @PostMapping("/password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void changePassword(@SessionAttribute(name = "chatUserId", required = false) Integer userId,
                               @RequestParam String currentPassword,
                               @RequestParam String newPassword,
                               Authentication authentication
    ) {
        chatPasswordService.changePassword(userId, authentication.getPrincipal(), currentPassword, newPassword);
    }
}
