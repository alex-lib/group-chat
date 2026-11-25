package org.my.dto;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class DtoMessage {
    private int id;
    private String text;
    private String dateTime;
    private String userName;
}
