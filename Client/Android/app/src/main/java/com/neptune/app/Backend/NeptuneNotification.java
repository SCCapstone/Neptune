package com.neptune.app.Backend;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Person;
import android.app.RemoteInput;
import android.content.ContentResolver;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.content.res.Resources;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.drawable.Drawable;
import android.graphics.drawable.Icon;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Parcelable;
import android.os.SystemClock;
import android.service.notification.StatusBarNotification;
import android.text.format.DateUtils;

import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.graphics.drawable.IconCompat;

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

    public String id;
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
            this.title = extras.getCharSequence(Notification.EXTRA_TITLE).toString();
        } else if (extras.containsKey(Notification.EXTRA_CONVERSATION_TITLE)) {
            this.title = extras.getCharSequence(Notification.EXTRA_CONVERSATION_TITLE).toString();
        } else if (extras.containsKey(Notification.EXTRA_TITLE_BIG)) {
            this.title = extras.getCharSequence(Notification.EXTRA_TITLE_BIG).toString();
        }

        // Get text data
        try {
            if (extras.containsKey(Notification.EXTRA_BIG_TEXT)) // Lots of text!
                this.text = extras.getCharSequence(Notification.EXTRA_BIG_TEXT).toString();
            else if (extras.containsKey(Notification.EXTRA_TEXT)) // Main body
                this.text = extras.getCharSequence(Notification.EXTRA_TEXT).toString();
            else if (extras.containsKey(Notification.EXTRA_INFO_TEXT)) // okay.. at least something right?
                this.text = extras.getCharSequence(Notification.EXTRA_INFO_TEXT).toString();
            else if (extras.containsKey(Notification.EXTRA_SUMMARY_TEXT)) // We're getting desperate...
                this.text = extras.getCharSequence(Notification.EXTRA_SUMMARY_TEXT).toString();
        } catch (Exception ignored) {}
        if (this.text == null)
            this.text = "";

        // Sub text
        if (extras.containsKey(Notification.EXTRA_SUB_TEXT)) {
            CharSequence charSequence = extras.getCharSequence(Notification.EXTRA_SUB_TEXT);
            if (charSequence != null) {
                this.subtext = charSequence.toString();
            }
        }


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
            this.isSilent = notification.category.equals(Notification.CATEGORY_TRANSPORT); // Media notification!



        this.id = statusBarNotification.getKey();
    }

    public void activate(JsonObject actionParameters) {
        try {
            Notification notification = statusBarNotification.getNotification();

            String buttonId = null;
            String textContent = null;
            String comboBoxChoice = null;

            if (actionParameters.has("id"))
                buttonId = NeptuneCrypto.convertBase64ToString(actionParameters.get("id").getAsString());
            if (actionParameters.has("text"))
                textContent = NeptuneCrypto.convertBase64ToString(actionParameters.get("text").getAsString());
            if (actionParameters.has("comboBoxChoice"))
                comboBoxChoice = NeptuneCrypto.convertBase64ToString(actionParameters.get("comboBoxChoice").getAsString());

            boolean firedIntent = false;
            if (buttonId != null || textContent != null || comboBoxChoice != null) {
                try {
                    if (notification.actions != null) {
                        // Loop through the Notification.Action array and extract the button data
                        for (int i = 0; i < notification.actions.length; i++) {
                            // Check if the action has a RemoteInput (text box / combo box)
                            RemoteInput[] remoteInputs = notification.actions[i].getRemoteInputs();
                            if (remoteInputs != null && remoteInputs.length > 0 && (textContent != null || comboBoxChoice != null)) {
                                for (RemoteInput remoteInput : remoteInputs) {
                                    if (remoteInput == null)
                                        continue;

                                    Bundle inputBundle = new Bundle();
                                    if (remoteInput.getAllowFreeFormInput() && textContent != null) {
                                        // Text box
                                        inputBundle.putCharSequence(remoteInput.getResultKey(), textContent);
                                    } else if (textContent != null) {
                                        // Predefined choices input
                                        inputBundle.putCharSequence(remoteInput.getResultKey(), comboBoxChoice);
                                    } else {
                                        break;
                                    }

                                    // Create a new Intent with the input data
                                    Intent fillInIntent = new Intent();
                                    RemoteInput.addResultsToIntent(remoteInputs, fillInIntent, inputBundle);

                                    // Trigger action with the input
                                    if (notification.actions[i].actionIntent != null) {
                                        notification.actions[i].actionIntent.send(context, 0, fillInIntent);
                                        firedIntent = true;
                                    }
                                }
                            } else {
                                // check if the right button
                                if (notification.actions[i].title.equals(buttonId) && !firedIntent && !buttonId.equalsIgnoreCase("reply")) {
                                    // Click this button (action)
                                    if (notification.actions[i].actionIntent != null) {
                                        try {
                                            notification.actions[i].actionIntent.send();
                                            firedIntent = true;
                                        } catch (PendingIntent.CanceledException e) {
                                            // ??
                                            e.printStackTrace();
                                        }
                                    }
                                }
                            }
                        }
                    }
                } catch (Exception e) {
                    e.printStackTrace();
                }
            } else {
                // No buttonId, textContent, or comboBoxChoice, so "tap" the notification body
                if (notification.contentIntent != null && !firedIntent) {
                    notification.contentIntent.send();
                }
            }
        } catch (PendingIntent.CanceledException e) {
            e.printStackTrace();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }


    public void activate() {
        activate(null);
    }


    public void dismiss() {
        Intent intent = new Intent(context, NotificationListenerService.class);
        intent.setAction(NotificationListenerService.ACTION_REMOVE_NOTIFICATION);
        intent.putExtra(NotificationListenerService.EXTRA_NOTIFICATION_KEY, statusBarNotification.getKey());
        context.startService(intent);
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

    /**
     * Jsonify a message.
     * @param message Message data
     * @return Message data, but as a JsonObject.
     */
    @NonNull
    private JsonObject processNotificationMessage(Notification.MessagingStyle.Message message) {
        JsonObject messageObject = new JsonObject();
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.N) {
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.P) {

                Person sender = message.getSenderPerson();


                if (sender != null) {
                    messageObject.addProperty("name", sender.getName().toString());

                    Icon personIcon = sender.getIcon();
                    if (personIcon != null) {
                        Drawable personDrawable = personIcon.loadDrawable(this.context);
                        String personString = encodeDrawableToDataString(personDrawable);
                        if (personString != null) {
                            messageObject.addProperty("icon", personString);
                        }
                    }
                }

            } else {
                // No sender information
                messageObject.addProperty("name", "Unknown");
            }

            messageObject.addProperty("text", message.getText().toString());


            // Extract image from Uri attachment
            Uri messageUri = null;

            messageUri = message.getDataUri();
            String mimeType = message.getDataMimeType();
            if (messageUri != null && mimeType != null) {
                if (messageUri.getScheme().equals(ContentResolver.SCHEME_CONTENT) ||
                        messageUri.getScheme().equals(ContentResolver.SCHEME_FILE)) {
                    Bitmap imageBitmap = null;
                    try {
                        imageBitmap = BitmapFactory.decodeStream(
                                this.context.getContentResolver().openInputStream(messageUri));
                    } catch (Exception e) {
                        e.printStackTrace();
                    }
                    if (imageBitmap != null) {
                        byte[] imageBitmapBytes = new byte[0];
                        try (ByteArrayOutputStream byteArrayOutputStream = new ByteArrayOutputStream()) {
                            imageBitmap.compress(Bitmap.CompressFormat.JPEG, 75, byteArrayOutputStream);
                            imageBitmapBytes = byteArrayOutputStream.toByteArray();
                        } catch (Exception ignored) {
                        }
                        if (imageBitmapBytes.length > 0) {
                            messageObject.addProperty("image", "data:image/jpeg;base64, " + NeptuneCrypto.convertBytesToBase64(imageBitmapBytes));
                        }
                    }
                }
            }
        }
        return messageObject;
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
            Drawable iconDrawable = icon.loadDrawable(MainActivity.Context);
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
            contentsObject.add("progress", progressData);
        }

        // Phone call
        if (notification.category != null && notification.category.equals(Notification.CATEGORY_CALL)) {
            jsonObject.addProperty("type", "call");
        }

        // Media type
        if (notification.category != null && notification.category.equals(Notification.CATEGORY_TRANSPORT)) {
            jsonObject.addProperty("type", "media");
        }


        JsonArray conversationDataArray = new JsonArray();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            if (extras.containsKey(Notification.EXTRA_MESSAGES)) {
                Parcelable[] messagesParcelable = extras.getParcelableArray(Notification.EXTRA_MESSAGES);
                List<Notification.MessagingStyle.Message> messages = Notification.MessagingStyle.Message.getMessagesFromBundleArray(messagesParcelable);
                if (messages != null && messages.size() > 0) {
                    for (Notification.MessagingStyle.Message message : messages) {
                        JsonObject messageObject = processNotificationMessage(message);
                        if (messageObject != null)
                            conversationDataArray.add(messageObject);
                    }
                }
            }

            if (statusBarNotification.getNotification().extras.containsKey(Notification.EXTRA_REMOTE_INPUT_HISTORY)) {
                // Input history
                CharSequence[] remoteInputHistory = statusBarNotification.getNotification().extras.getCharSequenceArray(NotificationCompat.EXTRA_REMOTE_INPUT_HISTORY);
                if (remoteInputHistory != null) {
                    for (int i = remoteInputHistory.length-1; i >= 0; i--) {
                        CharSequence remoteInputText = remoteInputHistory[i];
                        JsonObject messageObject = new JsonObject();

                        if (remoteInputText.toString().split(":").length >= 2) {
                            String[] data = remoteInputText.toString().split(":");
                            messageObject.addProperty("name", data[0]);
                            messageObject.addProperty("text", data[1]);
                        } else {
                            messageObject.addProperty("name", "You");
                            messageObject.addProperty("text", remoteInputText.toString());
                        }

                        conversationDataArray.add(messageObject);
                    }
                }
            }
        } else {
            if (extras.containsKey(NotificationCompat.EXTRA_TEXT_LINES)) {
                CharSequence[] textLines = extras.getCharSequenceArray(NotificationCompat.EXTRA_TEXT_LINES);
                if (textLines != null && textLines.length > 0) {
                    String senderName = null;
                    String messageText = null;
                    for (CharSequence textLine : textLines) {
                        String line = textLine.toString().trim();
                        if (line.startsWith("• ")) {
                            // This is a message text line
                            messageText = line.substring(2);
                        } else if (line.contains(": ")) {
                            // This is a sender name and message text line
                            String[] parts = line.split(": ", 2);
                            senderName = parts[0];
                            messageText = parts[1];
                        }
                    }
                    if (senderName != null && messageText != null) {
                        JsonObject conversationData = new JsonObject();
                        conversationData.addProperty("name", senderName);
                        conversationData.addProperty("text", messageText);
                        conversationDataArray.add(conversationData);
                    }
                }
            }
        }
        if (conversationDataArray.size() > 0) {
            jsonObject.addProperty("type", "conversation");
            contentsObject.add("conversationData", conversationDataArray);
        }



        // Actions (buttons, text box)
        JsonArray actionsArray = new JsonArray();
        PendingIntent contentIntent = notification.contentIntent;
        if (notification.actions != null) {
            try {

                // Loop through the Notification.Action array and extract the button data
                for (int i = 0; i < notification.actions.length; i++) {
                    JsonObject action = new JsonObject();
                    action.addProperty("id", String.valueOf(i)); // Action id
                    action.addProperty("type", "button");
                    action.addProperty("contents", notification.actions[i].title.toString());
                    actionsArray.add(action);

                    // Check if the action has a RemoteInput (text box / combo box)
                    RemoteInput[] remoteInputs = notification.actions[i].getRemoteInputs();
                    if (remoteInputs != null && remoteInputs.length > 0) {
                        for (RemoteInput remoteInput : remoteInputs) {
                            if (remoteInput == null)
                                continue;

                            JsonObject inputAction = new JsonObject();
                            inputAction.addProperty("id", remoteInput.getResultKey());
                            if (remoteInput.getAllowFreeFormInput()) {
                                // Text box
                                inputAction.addProperty("type", "textbox");
                                inputAction.addProperty("hint", remoteInput.getLabel().toString());

                                // Automated responses allowed?
                                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                                    inputAction.addProperty("allowGeneratedReplies", notification.actions[i].getAllowGeneratedReplies());
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

                contentsObject.add("actions", actionsArray);
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

        if (!jsonObject.has("type"))
            jsonObject.addProperty("type", "standard");

        return jsonObject;
    }

    @NonNull
    @Override
    public String toString() {
        return this.toJson().toString();
    }
}
