package com.neptune.app.Backend.Exceptions;

import com.neptune.app.Backend.EventEmitter;

// Too many event listeners (callbacks) subscribed to an event
public class TooManyEventListenersException extends Exception {
    public String HelpMessage = "Try remove excess listeners with .removeListener(Event, Callback) or .removeListeners(Event).";

    public TooManyEventListenersException() {
        super("Number of event listeners for this event exceeds the maximum of " + EventEmitter.MAX_EVENT_LISTENERS + ".");
    }

    public TooManyEventListenersException(String eventName) {
        super("Number of event listeners for " + eventName + " exceeds the maximum of " + EventEmitter.MAX_EVENT_LISTENERS + ".");
    }
}
