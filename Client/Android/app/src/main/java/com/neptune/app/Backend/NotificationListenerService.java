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

import java.io.ByteArrayOutputStream;

public class NotificationListenerService extends android.service.notification.NotificationListenerService {

    private NotificationManager notificationManager;

    Context context;

    //private String TAG = this.getClass().getSimpleName();
    //private NotificationServiceReceiver notificationServiceReceiver;

    @Override
    public void onCreate() {
        super.onCreate();
        context = getApplicationContext();

        startActivity(new Intent("android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS"));
       // notificationServiceReceiver = new NotificationServiceReceiver();
        //IntentFilter filter = new IntentFilter();
        //filter.addAction("com.neptune.app.Backend");
       // registerReceiver(notificationServiceReceiver, filter);
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
       // unregisterReceiver(notificationServiceReceiver);
    }

    public void onNotificationPosted(StatusBarNotification notification) {
       /* Log.i(TAG, "****** onNotificationPosted");
        Log.i(TAG, "ID :" + notification.getId() + "\t" + notification.getNotification().tickerText + "\t" + notification.getPackageName());
        Intent i = new Intent("com.neptune.app.Backend");
        i.putExtra("notification_event", "onNotificationPosted :" + notification.getPackageName() + "\n");
        sendBroadcast(i); */

        //Different Approach to see if this would be better/works (May need help with figuring this out)
        String pack = notification.getPackageName();
        String ticker = "";

        if (notification.getNotification().tickerText != null) {
            ticker = notification.getNotification().tickerText.toString();
        }

        Bundle extras = notification.getNotification().extras;
        String title = extras.getString("android.title");
        String text = extras.getCharSequence("android.text").toString();
        int id1 = extras.getInt(Notification.EXTRA_SMALL_ICON);
        Bitmap id = notification.getNotification().largeIcon;

        Log.i("Package", pack);
        Log.i("Ticker", ticker);
        Log.i("Title", title);
        Log.i("Text", text);

        Intent message = new Intent("Msg");
        message.putExtra("package", pack);
        message.putExtra("ticker", ticker);
        message.putExtra("title", title);
        message.putExtra("text", text);

        if (id != null) {
            ByteArrayOutputStream stream = new ByteArrayOutputStream();
            byte[] byteArray = stream.toByteArray();
            message.putExtra("icon", byteArray);
        }

        LocalBroadcastManager.getInstance(context).sendBroadcast(message);

    }

    public void onNotificationRemoved(StatusBarNotification notification) {
        /* Log.i(TAG, "******* onNotificationRemoved");
        Log.i(TAG, "ID :" + notification.getId() + "\t" + notification.getNotification().tickerText + "\t" + notification.getPackageName());
        Intent i = new Intent("com.neptune.app.Backend");
        i.putExtra("notification_event", "onNotificationRemoved :" + notification.getPackageName() + "\n");
        sendBroadcast(i);*/

        Log.i("Msg", "Notification Removed");

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

  /*  class NotificationServiceReceiver extends BroadcastReceiver {

        @Override
        public void onReceive(Context context, Intent intent) {
            if (intent.getStringExtra("command").equals("clearall")) {
                NotificationListenerService.this.cancelAllNotifications();
            }

            else if (intent.getStringExtra("command").equals("list")) {
                Intent intent1 = new Intent("com.neptune.app.Backend");
                intent1.putExtra("notification_event", "=============");
                sendBroadcast(intent1);
                int i = 1;

                for (StatusBarNotification notification : NotificationListenerService.this.getActiveNotifications()) {
                    Intent intent2 = new Intent("com.neptune.app.Backend");
                    intent2.putExtra("notification_event", i + " " + notification.getPackageName() + "\n");
                    sendBroadcast(intent2);
                    i++;
                }

                Intent intent3 = new Intent("com.neptune.app.Backend");
                intent3.putExtra("notification_event", "==== Notification List ====");
                sendBroadcast(intent3);
            }

        }
    } */
}
