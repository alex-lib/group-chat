package org.my.models;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.persistence.Version;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.ColumnDefault;

@Entity
@Table(name = "users", uniqueConstraints = @UniqueConstraint(name = "users_name_unique", columnNames = "name"))
@Getter
@Setter
public class ChatUser {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @Column(name = "user_id")
    private int id;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "password_hash")
    private String password;

    @Version
    @ColumnDefault("0")
    @Column(name = "password_version", nullable = false)
    private int passwordVersion;
}
