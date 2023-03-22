package com.neptune.app.Backend.Exceptions;

public class FailedToPair extends Exception {
    FailedToPair() {
        super("Unknown error while attempting to pair with server.");
    }

    public FailedToPair(String error) {
        super(error);
    }
}
