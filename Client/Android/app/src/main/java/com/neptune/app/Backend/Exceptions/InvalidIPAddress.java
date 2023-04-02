package com.neptune.app.Backend.Exceptions;

public class InvalidIPAddress extends Error {
    public InvalidIPAddress(String ip) {
        super("Invalid IP address supplied: " + ip);
    }
}
