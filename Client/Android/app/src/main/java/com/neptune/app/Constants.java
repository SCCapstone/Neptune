package com.neptune.app;

import android.app.NotificationManager;

public class Constants {
    public static final String RENAME_DIALOG_CLIENT_NAME = "client.name";
    public static final String EXTRA_SERVER_ID = "serverid";
    public static final String CHOOSE_FOLDER = "destination";

    public static final String INCOMING_FILES_NOTIFICATION_CHANNEL_DESCRIPTION = "Incoming files notifications";
    public static final String INCOMING_FILES_NOTIFICATION_CHANNEL_NAME = "Incoming files";
    public static final String INCOMING_FILES_NOTIFICATION_CHANNEL_ID = "neptune.notifications.incomingfiles";
    public static final int INCOMING_FILES_NOTIFICATION_CHANNEL_IMPORTANCE = NotificationManager.IMPORTANCE_HIGH;

    public static final String UPLOAD_FILES_NOTIFICATION_CHANNEL_DESCRIPTION = "File upload notifications";
    public static final String UPLOAD_FILES_NOTIFICATION_CHANNEL_NAME = "File uploads";
    public static final String UPLOAD_FILES_NOTIFICATION_CHANNEL_ID = "neptune.notifications.fileuploads";
    public static final int UPLOAD_FILES_NOTIFICATION_CHANNEL_IMPORTANCE = NotificationManager.IMPORTANCE_DEFAULT;


    public static final String SERVER_EVENT_CONFIGURATION_UPDATE = "configuration_update";
    public static final String SERVER_EVENT_REMOVED = "unpaired";
}
