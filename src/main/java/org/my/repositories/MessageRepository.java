package org.my.repositories;
import org.my.models.Message;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface MessageRepository extends JpaRepository<Message, Integer> {
    @Query("select message from Message message join fetch message.user")
    List<Message> findAllWithUsers(Sort sort);
}
