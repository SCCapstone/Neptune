package com.neptune.app.Backend;

import android.app.Notification;
import android.content.Context;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.os.Bundle;
import android.service.notification.StatusBarNotification;
import android.util.Log;

import java.util.Map;

public class NeptuneNotification {

    private StatusBarNotification statusBarNotification;
    private Map<String, Boolean> pushedServers;

    public String title = "";
    public String text = "";
    public String appPackageName = "";
    public String subtext = "";
    public String appName = "";
    public int id = 0;


    public NeptuneNotification(StatusBarNotification notification, Context context) throws Exception {
        this.statusBarNotification = notification;

        Bundle extras = notification.getNotification().extras;

        if (extras.getString("android.title") == null) { //Some notifications are not handled correctly, so we'll just skip em
            throw new Exception("Invalid notification");
        }

        String title = extras.getString("android.title");
        String text = "";
        if (extras.getCharSequence("android.text") != null) {
            text = extras.getCharSequence("android.text").toString();
        }
        int id1 = extras.getInt(Notification.EXTRA_SMALL_ICON);
        Bitmap id = notification.getNotification().largeIcon;

        this.title = title;
        this.appPackageName = notification.getPackageName();
        this.text = text;
        this.subtext = extras.getString("android.subtext");

        PackageManager pm = context.getPackageManager();
        ApplicationInfo ai;
        try {
            ai = pm.getApplicationInfo( this.appPackageName, 0);
        } catch (final PackageManager.NameNotFoundException e) {
            ai = null;
        }
       this.appName = (String) (ai != null ? pm.getApplicationLabel(ai) : "(unknown)");

        this.id = notification.getId();
    }

    public NeptuneNotification(StatusBarNotification statusBarNotification, Map<String, Boolean> pushedServers) {
        this.statusBarNotification = statusBarNotification;
        this.pushedServers = pushedServers;
    }

    public void activate() {

    }

    public void dismiss() {

    }

    @Override
    public String toString() {
        return "{ \"action\": \"create\", \"title\": \"" + this.title + "\", \"contents\": { \"text\": \"" + this.text + "\" }, \"applicationPackage\": \"" + this.appPackageName + "\", \"applicationName\": \"" + this.appName + "\", \"notificationId\": \"" + this.id + "\", \"type\": \"text\" }";
    }
}
