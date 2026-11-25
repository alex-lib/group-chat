package org.my.configurations;
import lombok.RequiredArgsConstructor;
import org.my.security.ChatAuthenticationSuccessHandler;
import org.my.services.ChatUserService;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.InternalAuthenticationServiceException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.session.SessionRegistry;
import org.springframework.security.core.session.SessionRegistryImpl;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.logout.HttpStatusReturningLogoutSuccessHandler;
import org.springframework.security.web.session.HttpSessionEventPublisher;
import jakarta.servlet.DispatcherType;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfiguration {
    private final ChatUserService chatUserService;
    private final ChatAuthenticationSuccessHandler authenticationSuccessHandler;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http, SessionRegistry sessionRegistry) throws Exception {
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
                .failureHandler((request, response, exception) -> {
                    SecurityContextHolder.clearContext();
                    if(request.getSession(false) != null) {
                        request.getSession(false).invalidate();
                    }
                    response.setStatus(exception instanceof InternalAuthenticationServiceException
                            ? HttpStatus.SERVICE_UNAVAILABLE.value() : HttpStatus.UNAUTHORIZED.value());
                })
                .permitAll()
        );
        http.logout(logout -> logout
                .deleteCookies("JSESSIONID")
                .logoutSuccessHandler(new HttpStatusReturningLogoutSuccessHandler(HttpStatus.NO_CONTENT))
        );
        http.csrf(csrf -> csrf.spa());
        http.sessionManagement(sessionManagement -> sessionManagement
                .sessionConcurrency(sessionConcurrency -> sessionConcurrency
                        .maximumSessions(-1)
                        .sessionRegistry(sessionRegistry)
                        .expiredSessionStrategy(event -> event.getResponse().setStatus(HttpStatus.UNAUTHORIZED.value())))
        );
        http.userDetailsService(chatUserService);
        return http.build();
    }

    @Bean
    public SessionRegistry sessionRegistry() {
        return new SessionRegistryImpl();
    }

    @Bean
    public HttpSessionEventPublisher httpSessionEventPublisher() {
        return new HttpSessionEventPublisher();
    }
}
