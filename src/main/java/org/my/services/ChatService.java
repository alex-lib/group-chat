package org.my.services;
import org.my.dto.DtoChatUser;
import org.my.dto.DtoMessage;
import org.my.mappers.ChatUserMapper;
import org.my.mappers.MessageMapper;
import org.my.models.ChatUser;
import org.my.models.Message;
import org.my.repositories.ChatUserRepository;
import org.my.repositories.MessageRepository;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.List;

@Service
@Transactional(readOnly = true)
public class ChatService {
    private final ChatUserRepository chatUserRepository;
    private final MessageRepository messageRepository;

    public ChatService(ChatUserRepository chatUserRepository, MessageRepository messageRepository) {
        this.chatUserRepository = chatUserRepository;
        this.messageRepository = messageRepository;
    }

    @Transactional
    public boolean sendMessage(String sessionId, String message) {
        if(message == null || message.isEmpty()) {
            return false;
        }
        ChatUser user = chatUserRepository.findBySessionId(sessionId).orElseThrow();
        Message newMessage = new Message();
        newMessage.setMessage(message);
        newMessage.setUser(user);
        newMessage.setDateTime(LocalDateTime.now());
        messageRepository.save(newMessage);
        return true;
    }

    public List<DtoMessage> getMessages() {
        return messageRepository.findAllWithUsers(Sort.by(Sort.Direction.ASC, "dateTime")).stream()
                .map(MessageMapper::mapMessageToDto)
                .toList();
    }

    public List<DtoChatUser> getUsers() {
        return chatUserRepository.findAll().stream()
                .map(ChatUserMapper::mapChatUserToDto)
                .toList();
    }
}
