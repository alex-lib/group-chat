package org.my.security;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.my.services.ChatUserService;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

@Component
public class ChatAuthenticationSuccessHandler implements AuthenticationSuccessHandler {
    private final ChatUserService chatUserService;

    public ChatAuthenticationSuccessHandler(ChatUserService chatUserService) {
        this.chatUserService = chatUserService;
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
                                        Authentication authentication) {
        chatUserService.joinChat(request.getSession().getId(), authentication.getName());
        response.setStatus(HttpStatus.OK.value());
    }
}
