package com.neptune.app.Backend;

import android.content.Context;
import android.content.Intent;
import android.os.Binder;
import android.os.Bundle;
import android.os.IBinder;
import android.service.notification.StatusBarNotification;
import android.util.Log;

import com.neptune.app.MainActivity;

public class NotificationListenerService extends android.service.notification.NotificationListenerService {
    public static final String EXTRA_NOTIFICATION_KEY = "notification_key";
    public static final String ACTION_REMOVE_NOTIFICATION = "remove_notification";


    public static Context context;

    @Override
    public void onCreate() {
        super.onCreate();
        context = getApplicationContext();

        Log.d("NotificationListener", "Created.");
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && ACTION_REMOVE_NOTIFICATION.equals(intent.getAction())) {
            String key = intent.getStringExtra(EXTRA_NOTIFICATION_KEY);
            cancelNotification(key);
        }
        return super.onStartCommand(intent, flags, startId);
    }


    public IBinder onBind(Intent intent) {
        return super.onBind(intent);
    }

    public void onNotificationPosted(StatusBarNotification notification) {
        try {
            Log.d("NotificationListener", "Notification from package: " + notification.getPackageName());
            Bundle extras = notification.getNotification().extras;
            if (extras.getCharSequence("android.title") == null) { //Some notifications are not handled correctly, so we'll just skip em
                return;
            }


            NeptuneNotification notify = new NeptuneNotification(notification, getApplicationContext());
            MainActivity.notificationManager.setNotification(notify);
        } catch (Exception e) {
            // yepirr
            e.printStackTrace();
        }
    }

    public void onNotificationRemoved(StatusBarNotification notification) {
        try {
            Log.i("Msg", "Notification Removed");
            MainActivity.notificationManager.deleteNotification(notification.getKey());
        } catch (Exception ignored) {

        }
    }
}
