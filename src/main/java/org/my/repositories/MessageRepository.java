package org.my.repositories;
import org.my.models.Message;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface MessageRepository extends JpaRepository<Message, Integer> {
    @Query("select message from Message message join fetch message.user order by message.id desc")
    List<Message> findLatestWithUsers(Pageable pageable);

    @Query("select message from Message message join fetch message.user where message.id < :before order by message.id desc")
    List<Message> findBeforeWithUsers(@Param("before") int before, Pageable pageable);

    @Query("select message from Message message join fetch message.user where message.id > :after order by message.id asc")
    List<Message> findAfterWithUsers(@Param("after") int after, Pageable pageable);

    @Modifying
    @Query(value = "lock table messages in share row exclusive mode", nativeQuery = true)
    void lockForInsert();
}
