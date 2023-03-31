package com.neptune.app.Backend;

import androidx.annotation.NonNull;

import com.google.gson.JsonObject;
import com.neptune.app.MainActivity;

import java.util.HashMap;


public class NotificationManager {

    private final HashMap<String, NeptuneNotification> notifications = new HashMap<>();

    public NotificationManager() {}

    /**
     * Adds a notification into the notification manager or updates an existing notification.
     *
     * After the notification is added/updated, we push the notification using <see>pushNotification()</see>
     * @param notification Notification to add and push out.
     */
    public void setNotification(@NonNull NeptuneNotification notification) {
        if (notifications.containsKey(notification.id)) {
            notifications.remove(notification.id);
        }
        notifications.put(notification.id, notification);
        this.pushNotification(notification.id);
    }

    /**
     * Pushes a notification to all servers.
     * @param id Id of the notification to push to servers.
     */
    public void pushNotification(String id) {
        if (notifications.containsKey(id)) {
            NeptuneNotification notification = notifications.get(id);
            if (notification != null)
                MainActivity.serverManager.processNotification(notification);
        }
    }

    /**
     * Activates the notification on this device (simulates a click).
     * @param id Id of the notification to activate.
     * @param actionParameters Details about activating the notification. Includes "id" (button that was clicked's text), "text" (text input) and "comboBoxChoice".
     */
    public void activateNotification(String id, JsonObject actionParameters) {
        if (notifications.containsKey(id)) {
            NeptuneNotification notification = notifications.get(id);
            if (notification != null)
                notification.activate(actionParameters);
        }
    }
    /**
     * Activates the notification on this device (simulates a click).
     * @param id Id of the notification to activate.
     */
    public void activateNotification(int id) {
        if (notifications.containsKey(id)) {
            NeptuneNotification notification = notifications.get(id);
            if (notification != null)
                notification.activate();
        }
    }

    /**
     * Dismisses or deletes a notification on this device (simulates a swipe on the notification).
     * @param id Id of the notification to dismiss.
     */
    public void dismissNotification(String id) {
        if (notifications.containsKey(id)) {
            NeptuneNotification notification = notifications.get(id);
            if (notification != null)
                notification.dismiss();
        }
    }


    /**
     * Tells the server to delete a notification.
     * @param id Id of the notification to delete.
     */
    public void deleteNotification(String id) {
        if (notifications.containsKey(id)) {
            if (notifications.get(id) != null)
                MainActivity.serverManager.processNotification(notifications.get(id), Server.SendNotificationAction.DELETE);
        }
    }
}
