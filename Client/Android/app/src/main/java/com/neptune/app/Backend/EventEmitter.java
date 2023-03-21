package com.neptune.app.Backend;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import com.neptune.app.Backend.Exceptions.TooManyEventListenersException;
import com.neptune.app.Backend.Exceptions.TooManyEventsException;
import com.neptune.app.Backend.Interfaces.ICallback;
import com.neptune.app.Backend.Interfaces.IEventEmitter;
import com.neptune.app.Backend.Interfaces.IEventEmitterListener;

/**
 * Event emitter class for handling incoming commands. Server adds an event listener, and these events are emitted by ConnectionManager.
 */
public class EventEmitter implements IEventEmitter {
    // Number of maximum events for this event emitter. This is to try and manage the max possible event listeners (MAX_EVENTS * MAX_EVENT_LISTENERS).
    public static final int MAX_EVENTS = 30;
    // Number of event listeners for an event
    public static final int MAX_EVENT_LISTENERS = 5;


    /**
     * Event emitter listener, this is the object that holds the callback class and allows for one time listening
     */
    public static class EventEmitterListener implements IEventEmitterListener {
        private final EventEmitter EventEmitter;
        private final String Event;
        private final ICallback Callback;
        private final boolean OneTimeListener;

        public EventEmitterListener(EventEmitter eventEmitter, String event, ICallback callback) {
            EventEmitter = eventEmitter;
            Event = event;
            Callback = callback;
            OneTimeListener = false;
        }
        public EventEmitterListener(EventEmitter eventEmitter, String event, ICallback callback, boolean oneTimeListener) {
            EventEmitter = eventEmitter;
            Event = event;
            Callback = callback;
            OneTimeListener = oneTimeListener;
        }
        @Override
        public void activate(Object... params) {
            if (OneTimeListener)
                EventEmitter.removeListener(Event, Callback);
            Callback.main(params);
        }
        @Override
        public String getEvent() {
            return Event;
        }
        @Override
        public ICallback getCallback() {
            return Callback;
        }
        @Override
        public boolean getOneTimeListener() {
            return OneTimeListener;
        }
    }

    /**
     * Map of events -> list of callbacks
     */
    private final Map<String, List<IEventEmitterListener>> Listeners = new HashMap<>();


    public EventEmitter() {}

    // Private stuff

    /**
     * Private class to add new eventEmitterListeners
     * @param event Event to add listener to
     * @param eventEmitterListener Event listener itself
     * @param prependListener Add event listener to the front of the list
     * @throws TooManyEventListenersException Too many listeners for this event (MAX_EVENT_LISTENERS)
     * @throws TooManyEventsException Too many events created (MAX_EVENTS)
     */
    private void addEventListener(String event, EventEmitterListener eventEmitterListener, boolean prependListener) throws TooManyEventListenersException, TooManyEventsException {
        if (!Listeners.containsKey(event)) {
            if (Listeners.size() >= MAX_EVENTS)
                throw new TooManyEventsException();

            Listeners.put(event, new ArrayList<>(1)); // Create listeners list
        }
        // Get listeners
        List<IEventEmitterListener> eventEmitterListeners = Listeners.get(event);
        if (eventEmitterListeners == null)
            eventEmitterListeners = new ArrayList<>(1);

        // Validate size
        if (eventEmitterListeners.size() >= MAX_EVENT_LISTENERS)
            throw new TooManyEventListenersException(event);

        // Add listener
        if (prependListener)
            eventEmitterListeners.add(0, eventEmitterListener); // Prepend
        else
            eventEmitterListeners.add(eventEmitterListener); // End

        // Update listeners
        Listeners.put(event, eventEmitterListeners);
    }
    /**
     * Private class to add new eventEmitterListeners
     * @param event Event to add listener to
     * @param eventEmitterListener Event listener itself
     * @throws TooManyEventListenersException Too many listeners for this event (MAX_EVENT_LISTENERS)
     * @throws TooManyEventsException Too many events created (MAX_EVENTS)
     */
    private void addEventListener(String event, EventEmitterListener eventEmitterListener) throws TooManyEventListenersException, TooManyEventsException {
        addEventListener(event, eventEmitterListener, false);
    }

    // Interface

    @Override
    public void emit(String event, Object... params) {
        if (Listeners.containsKey(event)) {
            List<IEventEmitterListener> eventEmitterList = Listeners.get(event);
            if (eventEmitterList == null || eventEmitterList.size() == 0) {
                Listeners.remove(event);
                return;
            }
            for (IEventEmitterListener eventEmitterListener : eventEmitterList) {
                eventEmitterListener.activate(params);
            }
        }
    }


    // Numbers

    @Override
    public int getMaxListeners() {
        return MAX_EVENT_LISTENERS;
    }

    @Override
    public int getMaxEvents() {
        return MAX_EVENTS;
    }

    @Override
    public String[] events() {
        Set<String> keys = Listeners.keySet();
        return keys.toArray(new String[0]);
    }

    @Override
    public IEventEmitterListener[] listeners(String event) {
        if (Listeners.containsKey(event)) {
            List<IEventEmitterListener> listeners = Listeners.get(event);
            if (listeners == null || listeners.size() == 0) {
                Listeners.remove(event);
                return new IEventEmitterListener[0];
            }

            return listeners.toArray(new IEventEmitterListener[0]);

        } else
            return new IEventEmitterListener[0];
    }

    public int eventsCount() {
        return Listeners.size();
    }

    @Override
    public int listenersCount(String event) {
        if (Listeners.containsKey(event)) {
            List<IEventEmitterListener> listeners = Listeners.get(event);
            if (listeners == null || listeners.size() == 0) {
                Listeners.remove(event);
                return 0;
            }

            return listeners.size();
        } else
            return 0;
    }

    @Override
    public int listenersCount(String event, ICallback callback) {
        if (Listeners.containsKey(event)) {
            List<IEventEmitterListener> listeners = Listeners.get(event);
            if (listeners == null || listeners.size() == 0) {
                Listeners.remove(event);
                return 0;
            }

            int count = 0;
            for (IEventEmitterListener eventEmitterListener : listeners) {
                if (eventEmitterListener.getCallback() == callback)
                    count++;
            }
            return count;
        } else
            return 0;
    }


    // Adding

    @Override
    public void addListener(String event, ICallback callback) throws TooManyEventListenersException, TooManyEventsException {
        // Create listener
        EventEmitterListener eventEmitterListener = new EventEmitterListener(this, event, callback);
        this.addEventListener(event, eventEmitterListener);
    }
    @Override
    public void on(String event, ICallback callback) throws TooManyEventListenersException, TooManyEventsException {
        this.addListener(event, callback);
    }
    @Override
    public void once(String event, ICallback callback) throws TooManyEventListenersException, TooManyEventsException {
        // Create listener
        EventEmitterListener eventEmitterListener = new EventEmitterListener(this, event, callback, true);
        this.addEventListener(event, eventEmitterListener);
    }

    @Override
    public void prependListener(String event, ICallback callback) throws TooManyEventsException, TooManyEventListenersException {
        // Create listener
        EventEmitterListener eventEmitterListener = new EventEmitterListener(this, event, callback);
        this.addEventListener(event, eventEmitterListener, true);
    }

    @Override
    public void prependOnceListener(String event, ICallback callback) throws TooManyEventsException, TooManyEventListenersException {
        // Create listener
        EventEmitterListener eventEmitterListener = new EventEmitterListener(this, event, callback, true);
        this.addEventListener(event, eventEmitterListener, true);
    }


    // Remove

    @Override
    public void removeListener(String event, ICallback callback) {
        if (Listeners.containsKey(event)) {
            // Get listeners
            List<IEventEmitterListener> eventEmitterListeners = Listeners.get(event); // Current
            if (eventEmitterListeners == null || eventEmitterListeners.size() == 0) {
                Listeners.remove(event); // There was nothing there anyways!
                return;
            }

            // New list, will expand by one if callback not there.
            List<IEventEmitterListener> newEventEmitterListeners = new ArrayList<>(eventEmitterListeners.size()-1);

            for (IEventEmitterListener eventEmitterListener :  eventEmitterListeners) { // Find it
                if (eventEmitterListener.getCallback() != callback) {
                    // Add to new list
                    newEventEmitterListeners.add(eventEmitterListener); // Don't add it
                }
            }

            // Replace listeners list
            Listeners.remove(event); // Remove old
            if (eventEmitterListeners.size() >= 1) // Any listeners?
                Listeners.put(event, newEventEmitterListeners); // Add new
        }
    }
    @Override
    public void off(String event, ICallback callback) {
        removeListener(event, callback);
    }

    @Override
    public void removeAllListeners(String event) {
        Listeners.remove(event);
    }
    @Override
    public void removeAllEvents() {
        Listeners.clear();
    }
}