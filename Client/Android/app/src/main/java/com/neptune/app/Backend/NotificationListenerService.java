package com.neptune.app.Backend;

import android.app.Notification;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.IntentFilter;
import android.graphics.Bitmap;
import android.os.Bundle;
import android.os.IBinder;
import android.content.Intent;
import android.service.notification.StatusBarNotification;
import android.util.Log;

import androidx.localbroadcastmanager.content.LocalBroadcastManager;

import com.neptune.app.MainActivity;

import java.io.ByteArrayOutputStream;

public class NotificationListenerService extends android.service.notification.NotificationListenerService {
    Context context;

    @Override
    public void onCreate() {
        super.onCreate();
        context = getApplicationContext();

        Log.d("NotificationListener", "Created.");
    }

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
        Log.d("NotificationListener", "Notification from package: " + notification.getPackageName());
        Bundle extras = notification.getNotification().extras;
        if (extras.getCharSequence("android.title") == null) { //Some notifications are not handled correctly, so we'll just skip em
            return;
        }

        try {
            NeptuneNotification notify = new NeptuneNotification(notification, getApplicationContext());
            MainActivity.notificationManager.setNotification(notify);
        } catch (Exception e) {
            // yepirr
        }
    }

    public void onNotificationRemoved(StatusBarNotification notification) {
        Log.i("Msg", "Notification Removed");
        MainActivity.notificationManager.deleteNotification(notification.getId());
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
