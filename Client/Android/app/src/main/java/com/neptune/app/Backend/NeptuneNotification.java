package com.neptune.app.Backend;

import android.app.Notification;
import android.app.PendingIntent;
import android.content.Context;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.os.Build;
import android.os.Bundle;
import android.service.notification.StatusBarNotification;
import android.util.Log;

import androidx.core.app.NotificationManagerCompat;

import com.google.gson.Gson;
import com.google.gson.JsonObject;
import com.neptune.app.MainActivity;

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
    public boolean silent = false;
    public String category;


    public NeptuneNotification(StatusBarNotification notification, Context context) throws Exception {
        this.statusBarNotification = notification;

        Bundle extras = notification.getNotification().extras;

        if (extras.getCharSequence("android.title") == null) { //Some notifications are not handled correctly, so we'll just skip em
            throw new Exception("Invalid notification");
        }

        String title = extras.getCharSequence("android.title").toString();
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
        this.category = notification.getNotification().category;
        this.silent = false;
        if (this.category != null)
            this.silent = notification.getNotification().category.equalsIgnoreCase(Notification.CATEGORY_TRANSPORT); // Media notification!

        PackageManager pm = context.getPackageManager();
        ApplicationInfo ai;
        try {
            ai = pm.getApplicationInfo( this.appPackageName, 0);
            this.appName = (String) (ai != null ? pm.getApplicationLabel(ai) : "(unknown)");
        } catch (final PackageManager.NameNotFoundException e) {
            ai = null;
            this.appName = "(unknown)";
        }

        this.id = notification.getId();
    }

    public void activate() {
        try {
            statusBarNotification.getNotification().contentIntent.send();
        } catch (PendingIntent.CanceledException e) {
            e.printStackTrace();
        }
    }

    public void dismiss() {
        NotificationManagerCompat.from(MainActivity.Context).cancel(id);
    }

    public class ContentsObject {
        public String text;
        public String subtext;

        ContentsObject() {}
        ContentsObject(String text, String subtext) {
            this.text = text;
            this.subtext = subtext;
        }
    }

    public JsonObject toJson() {
        JsonObject contentsObject = new JsonObject();
        contentsObject.addProperty("text", text);
        if (subtext != null)
            contentsObject.addProperty("subtext", subtext);

        JsonObject jsonObject = new JsonObject();
        jsonObject.addProperty("action", "create");
        jsonObject.addProperty("title", title);
        jsonObject.add("contents", contentsObject);

        if (appPackageName != null)
            jsonObject.addProperty("applicationPackage", appPackageName);
        if (appName != null)
            jsonObject.addProperty("applicationName", appName);

        jsonObject.addProperty("notificationId", id);
        jsonObject.addProperty("type", "text");
        jsonObject.addProperty("isActive", silent);
        return jsonObject;
    }

    @Override
    public String toString() {
        return this.toJson().toString();
    }
}
