package org.my.security;
import lombok.Getter;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import java.util.List;

@Getter
public class ChatUserDetails extends User {
    private final int passwordVersion;

    public ChatUserDetails(String name, String password, int passwordVersion) {
        super(name, password, List.of(new SimpleGrantedAuthority("ROLE_USER")));
        this.passwordVersion = passwordVersion;
    }
}
