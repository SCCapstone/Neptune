package com.neptune.app.Backend.Exceptions;

public class InvalidJsonDataType extends Exception {
    public InvalidJsonDataType() {
        super();
    }
    public InvalidJsonDataType(String message) {
        super(message);
    }
}
