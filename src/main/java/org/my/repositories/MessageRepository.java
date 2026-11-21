package org.my.repositories;
import org.my.models.Message;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface MessageRepository extends JpaRepository<Message, Integer> {
    @Override
    @EntityGraph(attributePaths = "user")
    List<Message> findAll(Sort sort);
}
