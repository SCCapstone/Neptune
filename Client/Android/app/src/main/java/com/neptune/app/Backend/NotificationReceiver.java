package com.neptune.app.Backend;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

import androidx.core.app.NotificationManagerCompat;

import com.neptune.app.MainActivity;

import java.util.UUID;

public class NotificationReceiver extends BroadcastReceiver {
    private static final String TAG = "NotificationReceiver";

    public static final String EXTRA_NOTIFICATION_ID = "notification_id";

    public static final String ACTION_DENY_INCOMING = "deny_incoming_file";
    public static final String ACTION_ACCEPT_INCOMING = "accept_incoming_file";
    public static final String EXTRA_SERVER_UUID = "server_uuid";
    public static final String EXTRA_FILE_UUID = "file_uuid";
    public static final String EXTRA_AUTHENTICATION_CODE = "authentication_code";
    public static final String EXTRA_FILE_PATH = "file_path";


    @Override
    public void onReceive(Context context, Intent intent) {
        // Get the action from the intent
        String action = intent.getAction();

        if (intent.hasExtra(EXTRA_NOTIFICATION_ID)) {
            int notificationId = intent.getIntExtra(EXTRA_NOTIFICATION_ID, MainActivity.lastNotificationId);
            NotificationManagerCompat.from(context).cancel(notificationId);
        }

        // Handle the action
        if (action.equals(ACTION_ACCEPT_INCOMING)) {
            try {
                if (!intent.hasExtra(EXTRA_SERVER_UUID)
                    || !intent.hasExtra(EXTRA_FILE_UUID)
                    || !intent.hasExtra(EXTRA_AUTHENTICATION_CODE)
                    || !intent.hasExtra(EXTRA_FILE_PATH)) {
                    return;
                }

                // Get the file UUID and authentication code from the intent
                String fileUUID = intent.getStringExtra(EXTRA_FILE_UUID);
                String authCode = intent.getStringExtra(EXTRA_AUTHENTICATION_CODE);
                String filePath = intent.getStringExtra(EXTRA_FILE_PATH);
                String serverUUID = intent.getStringExtra(EXTRA_SERVER_UUID);

                Server server = MainActivity.serverManager.getServer(UUID.fromString(serverUUID));

                // Call the upload file method
                Thread downloadThread = new Thread(() -> {
                    server.downloadFile(fileUUID, authCode, filePath);
                });
                downloadThread.setName(serverUUID + "-downloadingFile-" + fileUUID);
                downloadThread.start();

            } catch (Exception e) {
                Log.e(TAG, "onReceive: failure calling downloadFile", e);
            }
        } else if (action.equals(ACTION_DENY_INCOMING)) {
            // Do nothing??
        }
    }
}