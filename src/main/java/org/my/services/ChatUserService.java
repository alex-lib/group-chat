package org.my.services;
import org.my.models.ChatUser;
import org.my.repositories.ChatUserRepository;
import org.my.security.ChatUserDetails;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;

@Service
public class ChatUserService implements UserDetailsService {
    private final ChatUserRepository chatUserRepository;
    private final String password;
    private final PasswordEncoder passwordEncoder = PasswordEncoderFactories.createDelegatingPasswordEncoder();

    public ChatUserService(ChatUserRepository chatUserRepository, @Value("${chat.password}") String chatPassword) {
        this.chatUserRepository = chatUserRepository;
        if(!isValidPassword(chatPassword)) {
            throw new IllegalArgumentException("CHAT_PASSWORD must contain at least 12 characters and at most 72 UTF-8 bytes.");
        }
        this.password = passwordEncoder.encode(chatPassword);
    }

    @Transactional
    public int joinChat(String name, int passwordVersion) {
        ChatUser existing = chatUserRepository.findByName(name).orElse(null);
        if(existing == null) {
            chatUserRepository.insertIfAbsent(name, password);
            existing = chatUserRepository.findByName(name).orElseThrow();
        }
        if(existing.getPasswordVersion() != passwordVersion) {
            throw new BadCredentialsException("The password changed. Please sign in again.");
        }
        if(existing.getPassword() == null) {
            existing.setPassword(password);
        }
        return existing.getId();
    }

    @Transactional
    public void changePassword(Integer userId, String currentPassword, String newPassword) {
        if(userId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        }
        if(!isValidPassword(newPassword)) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_CONTENT);
        }
        ChatUser user = chatUserRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        String storedHash = user.getPassword() == null ? password : user.getPassword();
        if(!isValidPassword(currentPassword) || !passwordEncoder.matches(currentPassword, storedHash)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        }
        user.setPassword(passwordEncoder.encode(newPassword));
    }

    private boolean isValidPassword(String password) {
        return password != null && !password.isBlank() && password.length() >= 12
                && password.getBytes(StandardCharsets.UTF_8).length <= 72;
    }

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String username) {
        String name = Normalizer.normalize(username == null ? "" : username.strip(), Normalizer.Form.NFKC);
        if(name.isEmpty() || name.length() > 32 || name.codePoints().anyMatch(Character::isISOControl)) {
            throw new UsernameNotFoundException("Enter a name of 1–32 characters and the chat password.");
        }
        ChatUser user = chatUserRepository.findByName(name).orElse(null);
        String storedHash = user == null || user.getPassword() == null ? password : user.getPassword();
        return new ChatUserDetails(name, storedHash, user == null ? 0 : user.getPasswordVersion());
    }
}
