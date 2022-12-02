package com.neptune.app.Backend;

import android.app.Notification;
import java.util.Map;


public class NotificationManager {

    private Map<String, Notification> notifications;
    private ServerManager serverManager;

    public NotificationManager notificationManager(Map<String, Notification> notifications, ServerManager serverManager) {
        this.serverManager = serverManager;
        this.notifications = notifications;
        return null;
    }

    public void newNotification(Notification notification) {

    }

    public void updateNotification(Notification notification) {

    }

    public void notificationDismissed(Notification notification) {
        //notificationManager.cancelNotification(notificationId);
    }


}
