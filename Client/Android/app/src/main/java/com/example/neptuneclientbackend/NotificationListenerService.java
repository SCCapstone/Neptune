import android.app.Notification;
import android.os.IBinder;
import android.content.Intent;
import android.service.notification.StatusBarNotification;

public class NotificationListenerService extends android.service.notification.NotificationListenerService {

    private NotificationManager notificationManager;

    public void cancelNotification (Notification[] notfication) {

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
        return null;
    }

    public void onDestroy() {

    }

    public void onNotificationPosted(StatusBarNotification notification) {

    }

    public void onNotificationRemoved(StatusBarNotification notification) {

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