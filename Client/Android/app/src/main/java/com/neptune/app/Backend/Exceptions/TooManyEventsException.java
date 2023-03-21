package com.neptune.app.Backend.Exceptions;

import com.neptune.app.Backend.EventEmitter;

// Too many events to listen for!
public class TooManyEventsException extends Exception {
    public String HelpMessage = "Try remove excess events with .removeListeners(Event).";

    public TooManyEventsException() {
        super("Number of events exceeds the maximum of " + EventEmitter.MAX_EVENTS + ".");
    }
}
