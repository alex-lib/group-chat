package org.my.services;
import org.my.models.ChatUser;
import org.my.repositories.ChatUserRepository;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.util.Locale;

@Service
@Transactional(readOnly = true)
public class ChatUserService implements UserDetailsService {
    private final ChatUserRepository chatUserRepository;
    private final PasswordEncoder passwordEncoder = PasswordEncoderFactories.createDelegatingPasswordEncoder();

    public ChatUserService(ChatUserRepository chatUserRepository) {
        this.chatUserRepository = chatUserRepository;
    }

    @Transactional
    public void registerUser(String name, String password) {
        String displayName = normalizeName(name);
        if(!displayName.matches("[\\p{L}\\p{N}_-]{3,32}")) {
            throw new IllegalArgumentException("Use 3–32 letters, numbers, underscores or hyphens for your name.");
        }
        if(password == null || password.length() < 12) {
            throw new IllegalArgumentException("Use a password with at least 12 characters.");
        }
        if(password.getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new IllegalArgumentException("The password is too long. Use fewer characters.");
        }
        if(chatUserRepository.existsByNameIgnoreCase(displayName)) {
            throw new IllegalArgumentException("This name is unavailable. Choose another name.");
        }
        ChatUser user = new ChatUser();
        user.setName(displayName);
        user.setUsername(displayName.toLowerCase(Locale.ROOT));
        user.setPasswordHash(passwordEncoder.encode(password));
        chatUserRepository.save(user);
    }

    @Override
    public UserDetails loadUserByUsername(String username) {
        ChatUser user = chatUserRepository.findByUsername(normalizeName(username).toLowerCase(Locale.ROOT))
                .filter(chatUser -> chatUser.getPasswordHash() != null)
                .orElseThrow(() -> new UsernameNotFoundException("Invalid name or password."));
        return User.withUsername(user.getUsername())
                .password(user.getPasswordHash())
                .roles("USER")
                .build();
    }

    private String normalizeName(String name) {
        return Normalizer.normalize(name == null ? "" : name.strip(), Normalizer.Form.NFKC);
    }
}
