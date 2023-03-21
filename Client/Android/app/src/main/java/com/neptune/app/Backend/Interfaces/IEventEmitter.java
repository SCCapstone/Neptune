package com.neptune.app.Backend.Interfaces;

import com.neptune.app.Backend.EventEmitter;
import com.neptune.app.Backend.Exceptions.TooManyEventListenersException;
import com.neptune.app.Backend.Exceptions.TooManyEventsException;

import java.util.List;

public interface IEventEmitter {
    /**
     * Fires (activates) an event
     * @param event Event to fire
     * @param params Any data to pass to the event listener (which in turns is passed to the event listener's callback)
     */
    void emit(String event, Object... params);


    // Numbers and lists

    /**
     * Returns the maximum number of allowed event listeners for any event (MAX_EVENT_LISTENERS)
     * @return Number of event listeners allowed to be added to an event
     */
    int getMaxListeners();
    /**
     * Get the maximum number of unique events (that can be emitted/listened for)
     * @return Number of events allow to exist
     */
    int getMaxEvents();

    /**
     * Gets a list of all event names that have been created
     * @return List of event names
     */
    String[] events();

    /**
     * Gets a list of all event listeners for a specific event
     * @param event  Event to get all event listeners from
     * @return List of event listeners for an event
     */
    IEventEmitterListener[] listeners(String event);


    /**
     * Number of unique events that are being listened for
     * @return Number of listened for events
     */
    int eventsCount();

    /**
     * Count of event listeners in an event
     * @param event Event to count the number of event listeners
     * @return Number of listeners for an event
     */
    int listenersCount(String event);
    /**
     * Count of event listeners implementing a particular callback in an event
     * @param event Event to count the number of event listeners with a particular callback
     * @param callback Callback to look for
     * @return Number of event listeners with the given callback in an event
     */
    int listenersCount(String event, ICallback callback);


    // Add

    /**
     * Adds an event listener
     * @param event Event to listen for
     * @param callback Callback method fired when event is received
     * @throws TooManyEventListenersException Too many listeners for this event
     * @throws TooManyEventsException Too many events created
     */
    void addListener(String event, ICallback callback) throws TooManyEventsException, TooManyEventListenersException;
    /**
     * Adds an event listener.
     *
     * No checks are made to see if `callback` is already added.
     * Therefore multiple calls passing the same `callback` will result in `callback` being added and activated multiple times.
     * @param event Event to listen for
     * @param callback Callback method fired when event is received
     * @throws TooManyEventListenersException Too many listeners for this event
     * @throws TooManyEventsException Too many events created
     */
    void on(String event, ICallback callback) throws TooManyEventsException, TooManyEventListenersException;

    /**
     * Adds an event listener that is fire one time.
     *
     * No checks are made to see if `callback` is already added.
     * Therefore multiple calls passing the same `callback` will result in `callback` being added and activated multiple times.
     * @param event Event to listen for
     * @param callback Callback method fired when event is received
     * @throws TooManyEventListenersException Too many listeners for this event
     * @throws TooManyEventsException Too many events created
     */
    void once(String event, ICallback callback) throws TooManyEventsException, TooManyEventListenersException;

    /**
     * Adds an event listener to the front of the event listeners list for an event.
     * This makes this event fire first.
     * @param event
     * @throws TooManyEventsException
     * @throws TooManyEventListenersException
     */
    void prependListener(String event, ICallback callback) throws TooManyEventsException, TooManyEventListenersException;
    /**
     * Adds an event listener, which will eb fire once, to the front of the event listeners list for an event.
     * This makes this event fire first, but only once.
     * @param event
     * @throws TooManyEventsException
     * @throws TooManyEventListenersException
     */
    void prependOnceListener(String event, ICallback callback) throws TooManyEventsException, TooManyEventListenersException;


    // Remove

    /**
     * Removes a listener
     * @param event Event to remove listener from
     * @param callback Listener to remove
     */
    void off(String event, ICallback callback);

    /**
     * Removes a listener
     * @param event Event to remove listener from
     * @param callback Listener to remove
     */
    void removeListener(String event, ICallback callback);


    void removeAllListeners(String event);

    void removeAllEvents();
}
