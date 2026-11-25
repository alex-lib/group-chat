package org.my.services;
import lombok.RequiredArgsConstructor;
import org.my.dto.DtoChatUser;
import org.my.dto.DtoMessage;
import org.my.mappers.ChatUserMapper;
import org.my.mappers.MessageMapper;
import org.my.models.ChatUser;
import org.my.models.Message;
import org.my.repositories.ChatUserRepository;
import org.my.repositories.MessageRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ChatService {
    private static final int MESSAGE_PAGE_SIZE = 50;
    private final ChatUserRepository chatUserRepository;
    private final MessageRepository messageRepository;

    @Transactional
    public boolean sendMessage(Integer userId, String message) {
        if(userId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        }
        if(message == null || message.isEmpty()) {
            return false;
        }
        ChatUser user = chatUserRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        messageRepository.lockForInsert();
        Message newMessage = new Message();
        newMessage.setMessage(message);
        newMessage.setUser(user);
        newMessage.setDateTime(Instant.now());
        messageRepository.save(newMessage);
        return true;
    }

    public List<DtoMessage> getMessages(Integer before, Integer after) {
        if((before != null && before <= 0) || (after != null && after < 0)
                || (before != null && after != null)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Use either before or after with a valid message ID.");
        }
        PageRequest page = PageRequest.of(0, MESSAGE_PAGE_SIZE);
        List<Message> messages;
        if(after != null) {
            messages = messageRepository.findAfterWithUsers(after, page);
        } else {
            messages = before == null ? messageRepository.findLatestWithUsers(page)
                    : messageRepository.findBeforeWithUsers(before, page);
            messages = messages.reversed();
        }
        return messages.stream()
                .map(MessageMapper::mapMessageToDto)
                .toList();
    }

    public List<DtoChatUser> getUsers() {
        return chatUserRepository.findAll().stream()
                .map(ChatUserMapper::mapChatUserToDto)
                .toList();
    }
}
