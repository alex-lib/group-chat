package org.my.controllers;
import lombok.RequiredArgsConstructor;
import org.my.dto.DtoChatUser;
import org.my.dto.DtoMessage;
import org.my.services.ChatService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.SessionAttribute;
import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class ChatController {
    private final ChatService chatService;

    @PostMapping("/message")
    public Map<String, Boolean> sendMessage(@RequestParam String message,
                                            @SessionAttribute(name = "chatUserId", required = false) Integer userId
    ) {
        return Map.of("result", chatService.sendMessage(userId, message));
    }

    @GetMapping("/message")
    public List<DtoMessage> getMessagesList(@RequestParam(required = false) Integer before,
                                            @RequestParam(required = false) Integer after
    ) {
        return chatService.getMessages(before, after);
    }

    @GetMapping("/user")
    public List<DtoChatUser> getUsersList() {
        return chatService.getUsers();
    }
}
