package org.my.security;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.my.services.ChatUserService;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.transaction.TransactionException;

@Component
@RequiredArgsConstructor
public class ChatAuthenticationSuccessHandler implements AuthenticationSuccessHandler {
    private final ChatUserService chatUserService;

    @Override
    public void onAuthenticationSuccess(
            HttpServletRequest request,
            HttpServletResponse response,
                                        Authentication authentication
    ) {
        try {
            ChatUserDetails user = (ChatUserDetails) authentication.getPrincipal();
            int userId = chatUserService.joinChat(user.getUsername(), user.getPasswordVersion());
            request.getSession().setAttribute("chatUserId", userId);
            response.setStatus(HttpStatus.OK.value());
        } catch(BadCredentialsException exception) {
            SecurityContextHolder.clearContext();
            request.getSession().invalidate();
            response.setStatus(HttpStatus.UNAUTHORIZED.value());
        } catch(DataAccessException | TransactionException exception) {
            SecurityContextHolder.clearContext();
            request.getSession().invalidate();
            response.setStatus(HttpStatus.SERVICE_UNAVAILABLE.value());
        }
    }
}
