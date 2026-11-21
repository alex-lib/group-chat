package org.my.controllers;
import jakarta.servlet.http.HttpSession;
import org.my.dto.DtoChatUser;
import org.my.dto.DtoMessage;
import org.my.services.ChatService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import java.util.List;
import java.util.Map;

@RestController
public class ChatController {
    private final ChatService chatService;

    public ChatController(ChatService chatService) {
        this.chatService = chatService;
    }

    @GetMapping("/init")
    public Map<String, Boolean> init(HttpSession session) {
        return Map.of("result", chatService.isRegistered(session.getId()));
    }

    @PostMapping("/auth")
    public Map<String, Boolean> auth(@RequestParam String name, HttpSession session) {
        chatService.registerUser(session.getId(), name);
        return Map.of("result", true);
    }

    @PostMapping("/message")
    public Map<String, Boolean> sendMessage(@RequestParam String message, HttpSession session) {
        return Map.of("result", chatService.sendMessage(session.getId(), message));
    }

    @GetMapping("/message")
    public List<DtoMessage> getMessagesList() {
        return chatService.getMessages();
    }

    @GetMapping("/user")
    public List<DtoChatUser> getUsersList() {
        return chatService.getUsers();
    }
}
