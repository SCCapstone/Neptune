package com.neptune.app.Backend;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.PendingIntent;
import android.app.RemoteInput;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.content.res.Resources;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.drawable.Drawable;
import android.graphics.drawable.Icon;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.SystemClock;
import android.service.notification.StatusBarNotification;
import android.text.format.DateUtils;

import androidx.annotation.NonNull;
import androidx.core.app.NotificationManagerCompat;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import com.neptune.app.MainActivity;
import com.neptune.app.NotificationsActivity;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.TimeZone;

public class NeptuneNotification {
    private final Context context;

    private final StatusBarNotification statusBarNotification;

    public int id;
    public String applicationName;
    public String applicationPackageName;

    public String title;
    public String text;
    public String subtext;

    public boolean isSilent;
    public boolean onlyAlertOnce;

    public String category;


    public NeptuneNotification(StatusBarNotification statusBarNotification, Context context) throws Exception {
        this.statusBarNotification = statusBarNotification;
        this.context = context;

        Notification notification = statusBarNotification.getNotification();
        Bundle extras = notification.extras;

        if (!extras.containsKey(Notification.EXTRA_TITLE)
                && !extras.containsKey(Notification.EXTRA_TITLE_BIG)
                && !extras.containsKey(Notification.EXTRA_CONVERSATION_TITLE)) { //Some notifications are not handled correctly, so we'll just skip em
            throw new Exception("Invalid notification");
        }

        this.applicationPackageName = statusBarNotification.getPackageName();
        try {
            PackageManager packageManager = context.getPackageManager();
            this.applicationName = packageManager.getApplicationLabel(packageManager.getApplicationInfo(this.applicationPackageName, 0)).toString();
            if (this.applicationName == null)
                this.applicationName = "(unknown)";
        } catch (Exception e) {
            this.applicationName = "(unknown)";
        }


        if (extras.containsKey(Notification.EXTRA_TITLE)) {
            this.title = extras.getString(Notification.EXTRA_TITLE);
        } else if (extras.containsKey(Notification.EXTRA_CONVERSATION_TITLE)) {
            this.title = extras.getString(Notification.EXTRA_CONVERSATION_TITLE);
        } else if (extras.containsKey(Notification.EXTRA_TITLE_BIG)) {
            this.title = extras.getString(Notification.EXTRA_TITLE_BIG);
        }

        // Get text data
        if (extras.containsKey(Notification.EXTRA_BIG_TEXT)) // Lots of text!
            this.text = extras.getString(Notification.EXTRA_BIG_TEXT);
        else if (extras.containsKey(Notification.EXTRA_TEXT)) // Main body
            this.text = extras.getString(Notification.EXTRA_TEXT);
        else if (extras.containsKey(Notification.EXTRA_INFO_TEXT)) // okay.. at least something right?
            this.text = extras.getString(Notification.EXTRA_INFO_TEXT);
        else if (extras.containsKey(Notification.EXTRA_SUMMARY_TEXT)) // We're getting desperate...
            this.text = extras.getString(Notification.EXTRA_SUMMARY_TEXT);

        // Sub text
        this.subtext = extras.getString(Notification.EXTRA_SUB_TEXT);


        this.category = notification.category;

        // Only alert once?
        onlyAlertOnce = (notification.flags & Notification.FLAG_ONLY_ALERT_ONCE) != 0;

        // Silent?
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            String channelId = notification.getChannelId();
            android.app.NotificationManager notificationManager = (android.app.NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            NotificationChannel channel = notificationManager.getNotificationChannel(channelId);
            if (channel != null) {
                isSilent = (channel.getImportance() == android.app.NotificationManager.IMPORTANCE_LOW
                        || channel.getImportance() == android.app.NotificationManager.IMPORTANCE_MIN);
            } else {
                isSilent = (notification.priority == Notification.PRIORITY_LOW || notification.priority == Notification.PRIORITY_LOW);
            }
        } else {
            int flags = notification.flags;
            Uri soundUri = notification.sound;
            boolean shouldMakeSound = (soundUri != null) && (!Uri.EMPTY.equals(soundUri));

            isSilent = ((flags & Notification.FLAG_ONGOING_EVENT) == 0)
                    && ((flags & Notification.FLAG_INSISTENT) == 0)
                    && !shouldMakeSound
                    && !onlyAlertOnce;
        }


        if (this.category != null)
            this.isSilent = notification.category.equalsIgnoreCase(Notification.CATEGORY_TRANSPORT); // Media notification!



        this.id = statusBarNotification.getId();
    }

    public void activate(String actionId, String actionText) {
        try {
            // actionId and actionText _can_ be null!
            // be sure to check for that. (and if they're just empty?)
            if (actionId != null && actionText != null) {
                Bundle extras = this.statusBarNotification.getNotification().extras;

                try {
                    int id = Integer.parseInt(actionId);
                    if (extras.containsKey(Notification.EXTRA_COMPACT_ACTIONS)) {
                        Notification.Action[] actions = (Notification.Action[]) extras.get(Notification.EXTRA_COMPACT_ACTIONS);

                        // Check if the actionId is within the bounds of the actions array
                        if (id >= 0 && id < actions.length) {
                            // Get the PendingIntent of the selected action
                            PendingIntent actionIntent = actions[id].actionIntent;

                            // Activate the action by calling its PendingIntent
                            actionIntent.send();
                        }
                    }

                } catch (Exception e) {
                    e.printStackTrace();
                }
            }

            statusBarNotification.getNotification().contentIntent.send();
        } catch (PendingIntent.CanceledException e) {
            e.printStackTrace();
        }
    }

    public void activate(String actionId) { activate(actionId, null); }
    public void activate() { activate(null, null); }


    public void dismiss() {
        NotificationManagerCompat.from(this.context).cancel(id);
    }

    /**
     * Internal helper method to convert a drawable to a bitmap and then encoding that bitmap into a base64 data string.
     * @param iconDrawable Drawable to convert to bitmap then encoded string (base64)
     * @return Image data string
     */
    private String encodeDrawableToDataString(Drawable iconDrawable) {
        Bitmap iconBitmap = Bitmap.createBitmap(iconDrawable.getIntrinsicWidth(), iconDrawable.getIntrinsicWidth(), Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(iconBitmap);
        iconDrawable.setBounds(0, 0, canvas.getWidth(), canvas.getHeight());
        iconDrawable.draw(canvas);
        try (ByteArrayOutputStream byteArrayOutputStream = new ByteArrayOutputStream()) {
            iconBitmap.compress(Bitmap.CompressFormat.JPEG, 75, byteArrayOutputStream);
            byte[] iconBitmapBytes = byteArrayOutputStream.toByteArray();
            return "data:image/jpeg;base64, " + NeptuneCrypto.convertBytesToBase64(iconBitmapBytes);
        } catch (Exception ignored) {}
        return null;
    }

    public JsonObject toJson() {
        // add image data (if the notification has one). Images should be encoded via base64 (use NeptuneCrypto for this)
        // add action buttons (buttons on the notifications).
        // add text box
        // add progress bar (not too pressed on this)

        Notification notification = statusBarNotification.getNotification();
        Bundle extras = notification.extras;


        JsonObject jsonObject = new JsonObject();
        jsonObject.addProperty("action", "create");

        if (applicationPackageName != null)
            jsonObject.addProperty("applicationPackage", applicationPackageName);
        if (applicationName != null)
            jsonObject.addProperty("applicationName", applicationName);

        jsonObject.addProperty("notificationId", id);

        try {
            // This gets the icon and converts it to a base64 data stream
            Icon icon = notification.getSmallIcon();
            Drawable iconDrawable = icon.loadDrawable(this.context);
            String iconString = encodeDrawableToDataString(iconDrawable);
            if (iconString != null)
                jsonObject.addProperty("notificationIcon", iconString);
        } catch (Exception e) {
            e.printStackTrace();
        }

        jsonObject.addProperty("title", title);
        jsonObject.addProperty("type", "text"); // bleh

        // Add content data (image, buttons, etc)
        JsonObject contentsObject = new JsonObject();
        contentsObject.addProperty("text", text);
        if (subtext != null)
            contentsObject.addProperty("subtext", subtext);

        // Add image
        try {
            if (extras.containsKey(Notification.EXTRA_PICTURE ) || extras.containsKey(Notification.EXTRA_PICTURE_ICON)) {
                Bitmap imageBitmap = (Bitmap) extras.get(Notification.EXTRA_PICTURE);
                if (extras.containsKey(Notification.EXTRA_PICTURE_ICON) && extras.get(Notification.EXTRA_PICTURE_ICON) != null)
                    imageBitmap = (Bitmap) extras.get(Notification.EXTRA_PICTURE_ICON);

                if (imageBitmap != null) {
                    try (ByteArrayOutputStream byteArrayOutputStream = new ByteArrayOutputStream()) {
                        imageBitmap.compress(Bitmap.CompressFormat.JPEG, 75, byteArrayOutputStream);
                        byte[] imageBitmapBytes = byteArrayOutputStream.toByteArray();
                        contentsObject.addProperty("image", "data:image/jpeg;base64, " + NeptuneCrypto.convertBytesToBase64(imageBitmapBytes));
                    } catch (Exception ignored) {}
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }

        // Timer data
        if (extras.containsKey(Notification.EXTRA_SHOW_CHRONOMETER)
                && (notification.category != null && (notification.category.equals(Notification.EXTRA_SHOW_CHRONOMETER)
                    || notification.category.equals(Notification.CATEGORY_STOPWATCH)))) {
            jsonObject.addProperty("type", "timer");
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.N) {
                JsonObject timerData = new JsonObject();
                boolean countingDown = countingDown = extras.getBoolean(Notification.EXTRA_CHRONOMETER_COUNT_DOWN, true);
                timerData.addProperty("countingDown", countingDown);
                jsonObject.add("timerData", timerData);
            }

        }

        // Progress bar data
        if (extras.containsKey(Notification.EXTRA_PROGRESS) &&
                (notification.category != null && (notification.category.equals(Notification.CATEGORY_PROGRESS)
                    || notification.category.equals(Notification.CATEGORY_STATUS)))) {
            jsonObject.addProperty("type", "progress");
            JsonObject progressData = new JsonObject();
            progressData.addProperty("value", extras.getInt(Notification.EXTRA_PROGRESS));

            if (extras.containsKey(Notification.EXTRA_PROGRESS_MAX))
                progressData.addProperty("max", extras.getInt(Notification.EXTRA_PROGRESS_MAX));

            if (extras.containsKey(Notification.EXTRA_PROGRESS_INDETERMINATE))
                progressData.addProperty("isIndeterminate", extras.getBoolean(Notification.EXTRA_PROGRESS_INDETERMINATE, false));

            // Add progress data to a parent JsonObject
            jsonObject.add("progress", progressData);
        }

        // Phone call
        if (notification.category != null && notification.category.equals(Notification.CATEGORY_CALL)) {
            jsonObject.addProperty("type", "call");
        }

        // Media type
        if (notification.category != null && notification.category.equals(Notification.CATEGORY_TRANSPORT)) {
            jsonObject.addProperty("type", "media");
        }

        // Actions (buttons, text box)
        // Needs work!
        JsonArray actionsArray = new JsonArray();
        PendingIntent contentIntent = notification.contentIntent;
        if (extras.containsKey(Notification.EXTRA_COMPACT_ACTIONS)) {
            try {
                // Get the Notification.Action array from the extras
                Notification.Action[] actions = (Notification.Action[]) extras.get(Notification.EXTRA_COMPACT_ACTIONS);

                // Loop through the Notification.Action array and extract the button data
                for (int i = 0; i < actions.length; i++) {
                    JsonObject action = new JsonObject();
                    action.addProperty("id", String.valueOf(i)); // Action id
                    action.addProperty("type", "button");
                    action.addProperty("contents", actions[i].title.toString());
                    actionsArray.add(action);

                    // Check if the action has a RemoteInput (text box / combo box)
                    RemoteInput[] remoteInputs = actions[i].getRemoteInputs();
                    if (remoteInputs != null && remoteInputs.length > 0) {
                        for (RemoteInput remoteInput : remoteInputs) {
                            if (remoteInput == null)
                                continue;

                            JsonObject inputAction = new JsonObject();
                            inputAction.addProperty("id", remoteInput.getResultKey());
                            if (remoteInput.getAllowFreeFormInput()) {
                                // Text box
                                inputAction.addProperty("type", "text");
                                inputAction.addProperty("hint", remoteInput.getLabel().toString());

                                // Automated responses allowed?
                                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                                    inputAction.addProperty("allowGeneratedReplies", actions[i].getAllowGeneratedReplies());
                                }
                            } else {
                                // Predefined choices input
                                CharSequence[] choices = remoteInput.getChoices();
                                if (choices != null && choices.length > 0) {
                                    JsonArray choicesArray = new JsonArray();
                                    for (CharSequence choice : choices)
                                        choicesArray.add(choice.toString());

                                    inputAction.addProperty("type", "combobox");
                                    inputAction.add("contents", choicesArray);
                                    inputAction.addProperty("hint", remoteInput.getLabel().toString());
                                }
                            }

                            actionsArray.add(inputAction);
                        }
                    }
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
        jsonObject.add("contents", contentsObject);

        // Only alert once?
        jsonObject.addProperty("onlyAlertOnce", onlyAlertOnce);

        // Priority?
        String priorityString;
        switch (notification.priority) {
            case Notification.PRIORITY_MAX:
                priorityString = "MAX";
                break;
            case Notification.PRIORITY_HIGH:
                priorityString = "HIGH";
                break;

            case Notification.PRIORITY_DEFAULT:
                priorityString = "DEFAULT";
                break;

            case Notification.PRIORITY_LOW:
                priorityString = "LOW";
                break;
            case Notification.PRIORITY_MIN:
                priorityString = "MIN";
                break;
            default:
                priorityString = "default";
                break;
        }
        jsonObject.addProperty("priority", priorityString);


        // Add timestamp
        Date date = new Date(statusBarNotification.getNotification().when);
        SimpleDateFormat isoFormatter = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
        isoFormatter.setTimeZone(TimeZone.getTimeZone("UTC"));
        String isoTimestamp = isoFormatter.format(date);
        jsonObject.addProperty("timestamp", isoTimestamp);

        // Silent?
        jsonObject.addProperty("isActive", !isSilent);

        return jsonObject;
    }

    @NonNull
    @Override
    public String toString() {
        return this.toJson().toString();
    }
}
