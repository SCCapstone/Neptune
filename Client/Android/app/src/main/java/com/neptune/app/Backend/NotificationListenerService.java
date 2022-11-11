package com.neptune.app.Backend;

import android.app.Notification;
import android.os.IBinder;
import android.content.Intent;
import android.service.notification.StatusBarNotification;

public class NotificationListenerService extends android.service.notification.NotificationListenerService {

    private NotificationManager notificationManager;

    public void cancelNotification (Notification[] notification) {

    }

    public void cancelNotification(Notification notification) {
    }

    public StatusBarNotification getActiveNotfications() {

        return null;
    }

    public StatusBarNotification[] getSnoozedNotfications() {

        return new StatusBarNotification[0];
    }

    public IBinder onBind(Intent intent) {
        return super.onBind(intent);

    }

    public void onDestroy() {
        super.onDestroy();
    }

    public void onNotificationPosted(StatusBarNotification notification) {
        onNotificationPosted(notification);
    }

    public void onNotificationRemoved(StatusBarNotification notification) {
        onNotificationRemoved(notification);
    }

    public void onSilentStatusBariconsVisibilityChanged(boolean status) {

    }

    public void setNotificationsShown(Notification[] notification) {

    }

    public void setNotificationsShown(Notification notification) {

    }

    public void snoozeNotification(Notification[] notifications) {

    }

    public void snoozeNotification(Notification notification) {

    }
}
