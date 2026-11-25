package org.my.services;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.session.SessionInformation;
import org.springframework.security.core.session.SessionRegistry;
import org.springframework.stereotype.Service;
import org.springframework.transaction.TransactionException;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class ChatPasswordService {
    private final ChatUserService chatUserService;
    private final SessionRegistry sessionRegistry;

    public void changePassword(Integer userId, Object principal, String currentPassword, String newPassword) {
        try {
            chatUserService.changePassword(userId, currentPassword, newPassword);
        } catch(OptimisticLockingFailureException exception) {
            throw new ResponseStatusException(HttpStatus.CONFLICT);
        } catch(DataAccessException | TransactionException exception) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE);
        }
        sessionRegistry.getAllSessions(principal, false).forEach(SessionInformation::expireNow);
    }
}
