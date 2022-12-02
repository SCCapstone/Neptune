package com.neptune.app.Backend;

import android.app.Notification;
import java.util.Map;

public class NeptuneNotification extends NotificationListenerService {

    private Notification statusBarNotification;
    private Map<String, Boolean> pushedServers;

    public Notification statusBarNotification(Notification statusBarNotification, Map<String, Boolean> pushedServers) {
        this.statusBarNotification = statusBarNotification;
        this.pushedServers = pushedServers;

        return null;
    }

    public void activate() {

    }

    public void dismiss() {

    }

    public void pushToServer() {

    }
}
