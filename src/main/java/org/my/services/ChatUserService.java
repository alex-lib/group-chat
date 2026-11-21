package org.my.services;
import org.my.models.ChatUser;
import org.my.repositories.ChatUserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;

@Service
public class ChatUserService implements UserDetailsService {
    private final ChatUserRepository chatUserRepository;
    private final String passwordHash;

    public ChatUserService(ChatUserRepository chatUserRepository, @Value("${chat.password}") String chatPassword) {
        this.chatUserRepository = chatUserRepository;
        if(chatPassword.isBlank() || chatPassword.length() < 12
                || chatPassword.getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new IllegalArgumentException("CHAT_PASSWORD must contain at least 12 characters and at most 72 UTF-8 bytes.");
        }
        this.passwordHash = PasswordEncoderFactories.createDelegatingPasswordEncoder().encode(chatPassword);
    }

    @Transactional
    public void joinChat(String sessionId, String name) {
        ChatUser user = new ChatUser();
        user.setSessionId(sessionId);
        user.setName(name);
        chatUserRepository.save(user);
    }

    @Override
    public UserDetails loadUserByUsername(String username) {
        String name = Normalizer.normalize(username == null ? "" : username.strip(), Normalizer.Form.NFKC);
        if(name.isEmpty() || name.length() > 32 || name.codePoints().anyMatch(Character::isISOControl)) {
            throw new UsernameNotFoundException("Enter a name of 1–32 characters and the chat password.");
        }
        return User.withUsername(name)
                .password(passwordHash)
                .roles("USER")
                .build();
    }
}
