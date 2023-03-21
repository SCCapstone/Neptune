package com.neptune.app.Backend.Interfaces;

import com.neptune.app.Backend.EventEmitter;

public interface IEventEmitterListener {
    /**
     * Calls the callback method, this is called when the event is emitted.
     * Parameters passed depend on the event you're listening too.
     * @param params Parameters passed by the event.
     */
    void activate(Object... params);

    /**
     * Gets the event name this event emitter listener is listener to.
     * @return Event name event emitter listener is listening for.
     */
    String getEvent();

    /**
     * Gets the callback method that will called when activated.
     * @return Method called when event emitted.
     */
    ICallback getCallback();

    /**
     * Whether this event emitter listener will remove itself after the first activation.
     * Making this listener a one-time listener.
     * @return Whether this event listener is called one time after an event is emitted or until removed.
     */
    boolean getOneTimeListener();
}
