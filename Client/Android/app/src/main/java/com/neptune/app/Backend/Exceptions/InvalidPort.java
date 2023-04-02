package com.neptune.app.Backend.Exceptions;

public class InvalidPort extends Error {
    public InvalidPort(int port) {
        super("Invalid port supplied: " + port);
    }
}
