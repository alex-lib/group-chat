package org.my.repositories;
import org.my.models.ChatUser;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface ChatUserRepository extends JpaRepository<ChatUser, Integer> {
    Optional<ChatUser> findByName(String name);

    @Modifying
    @Query(value = "insert into users (user_id, name, password_hash, password_version) "
            + "values (nextval('users_seq'), :name, :password, 0) "
            + "on conflict (name) do nothing", nativeQuery = true)
    void insertIfAbsent(@Param("name") String name, @Param("password") String password);
}
