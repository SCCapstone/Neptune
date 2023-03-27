package com.neptune.app.Backend;

import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.os.IBinder;
import android.service.notification.StatusBarNotification;
import android.util.Log;

import com.neptune.app.MainActivity;

public class NotificationListenerService extends android.service.notification.NotificationListenerService {
    Context context;

    @Override
    public void onCreate() {
        super.onCreate();
        context = getApplicationContext();

        Log.d("NotificationListener", "Created.");
    }


    public IBinder onBind(Intent intent) {
        return super.onBind(intent);

    }

    public void onDestroy() {
        super.onDestroy();
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
            MainActivity.notificationManager.deleteNotification(notification.getId());
        } catch (Exception ignored) {

        }
    }
}
