package org.my.configurations;
import org.my.security.ChatAuthenticationSuccessHandler;
import org.my.services.ChatUserService;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.logout.HttpStatusReturningLogoutSuccessHandler;
import jakarta.servlet.DispatcherType;

@Configuration
@EnableWebSecurity
public class SecurityConfiguration {
    private final ChatUserService chatUserService;
    private final ChatAuthenticationSuccessHandler authenticationSuccessHandler;

    public SecurityConfiguration(ChatUserService chatUserService, ChatAuthenticationSuccessHandler authenticationSuccessHandler) {
        this.chatUserService = chatUserService;
        this.authenticationSuccessHandler = authenticationSuccessHandler;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http.authorizeHttpRequests(authorizeHttpRequests -> authorizeHttpRequests
                .dispatcherTypeMatchers(DispatcherType.ERROR).permitAll()
                .requestMatchers(HttpMethod.GET, "/", "/index.html", "/css/**", "/js/**", "/favicon.ico", "/init").permitAll()
                .anyRequest().authenticated()
        );
        http.exceptionHandling(exceptionHandling -> exceptionHandling
                .authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED))
        );
        http.formLogin(formLogin -> formLogin
                .loginPage("/")
                .loginProcessingUrl("/auth")
                .usernameParameter("name")
                .successHandler(authenticationSuccessHandler)
                .failureHandler((request, response, exception) -> response.setStatus(HttpStatus.UNAUTHORIZED.value()))
                .permitAll()
        );
        http.logout(logout -> logout
                .deleteCookies("JSESSIONID")
                .logoutSuccessHandler(new HttpStatusReturningLogoutSuccessHandler(HttpStatus.NO_CONTENT))
        );
        http.csrf(csrf -> csrf.spa());
        http.userDetailsService(chatUserService);
        return http.build();
    }
}
