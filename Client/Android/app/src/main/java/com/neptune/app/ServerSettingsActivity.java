package com.neptune.app;//comment

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ContentResolver;
import android.content.ContentUris;
import android.content.DialogInterface;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Log;
import android.widget.Button;
import android.widget.CheckBox;
import android.widget.TextView;
import android.widget.Toast;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.appcompat.app.ActionBar;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import androidx.documentfile.provider.DocumentFile;

import com.neptune.app.Backend.Server;

import java.io.File;
import java.io.IOException;
import java.lang.ref.WeakReference;
import java.util.UUID;


public class ServerSettingsActivity extends AppCompatActivity {
    private String TAG = "ServerSettings-";
    private Server server;


    // Items from the activity layout
    private Button btnSendFile;
    private Button btnSendClipboard;
    private Button btnReceiveClipboard;

    private CheckBox chkNotificationsSync;
    private Button btnManageSyncedNotifications;

    private CheckBox chkClipboardEnable;
    private CheckBox chkClipboardServerGet;

    private CheckBox chkFileSharingEnable;
    private CheckBox chkFileSharingAutoAcceptFiles;
    private CheckBox chkFileSharingNotifyOnReceive;
    private CheckBox chkFileSharingServerSet;
    private Button btnFileSharingManageDestination;
    private TextView txtFileSharingDestination;

    private TextView txtServerIpAddress;
    private TextView txtServerWebSocketConnected;
    private TextView txtServerLastPingDelay;


    // Where the incoming files are save to
    private Uri incomingFilesDirectoryUri;

    private ActivityResultLauncher<Intent> folderPickerLauncher;
    private ActivityResultLauncher<Intent> filePickerLauncher;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_server_settings);

        // Grab the server
        String serverId = getIntent().getStringExtra(Constants.EXTRA_SERVER_ID);
        server = MainActivity.serverManager.getServer(UUID.fromString(serverId));
        if (server == null) {
            showErrorMessage("No such server found", "I'm sorry, but that server does not exist. Go back and try again?");
            finish();
            return;
        }

        ActionBar actionBar = getSupportActionBar();
        if(actionBar!=null) {
            actionBar.setDisplayHomeAsUpEnabled(true);
            String actionBarTitle = getString(R.string.title_activity_server_settings_placeholder, server.friendlyName);
            actionBar.setTitle(actionBarTitle);
        }

        TAG = "ServerSettings-" + server.friendlyName;

        btnSendFile = findViewById(R.id.btnSendFile);
        btnSendClipboard = findViewById(R.id.btnSendClipboard);
        btnReceiveClipboard = findViewById(R.id.btnReceiveClipboard);
        chkNotificationsSync = findViewById(R.id.server_sync_notifications);
        btnManageSyncedNotifications = findViewById(R.id.server_manage_app_notifications);
        chkClipboardEnable = findViewById(R.id.clipboard_enable);
        chkClipboardServerGet = findViewById(R.id.clipboard_server_get);
        chkFileSharingEnable = findViewById(R.id.filesharing_enable_title);
        chkFileSharingAutoAcceptFiles = findViewById(R.id.filesharing_auto_accept_files);
        chkFileSharingNotifyOnReceive = findViewById(R.id.filesharing_notify_on_receive);
        chkFileSharingServerSet = findViewById(R.id.filesharing_server_set);
        btnFileSharingManageDestination = findViewById(R.id.filesharing_destination_folder_button);
        txtFileSharingDestination = findViewById(R.id.filesharing_destination_folder_text);
        txtServerIpAddress = findViewById(R.id.server_ipaddress_title);
        txtServerWebSocketConnected = findViewById(R.id.server_websocket_title);
        txtServerLastPingDelay = findViewById(R.id.server_ping_title);
        Button btnSync = findViewById(R.id.server_settings_sync);

        Button btnSave = findViewById(R.id.server_settings_save);
        Button btnDelete = findViewById(R.id.server_settings_delete);


        // Event listeners
        btnSendFile.setOnClickListener((view) -> openFilePickerToSendFileToServer());
        btnSendClipboard.setOnClickListener((view) -> {
            server.sendClipboard();
            Toast.makeText(this, "Clipboard sent", Toast.LENGTH_SHORT).show();
        });
        btnReceiveClipboard.setOnClickListener((view) -> server.requestClipboard());

        chkNotificationsSync.setOnCheckedChangeListener((compoundButton, isChecked) -> updateClipboardSettings());
        btnManageSyncedNotifications.setOnClickListener((view) -> {
                Intent notificationsActivity = new Intent(ServerSettingsActivity.this, NotificationsActivity.class);
                notificationsActivity.putExtra(Constants.EXTRA_SERVER_ID, serverId);
                startActivity(notificationsActivity);
        });

        chkClipboardEnable.setOnCheckedChangeListener((compoundButton, isChecked) -> updateClipboardSettings());

        chkFileSharingEnable.setOnCheckedChangeListener((compoundButton, isChecked) -> updateFileSharingSettings());
        btnFileSharingManageDestination.setOnClickListener((view) -> openFolderPickerToSetDestinationDirectory());


        btnSync.setOnClickListener((view) -> {
            new Thread(() -> {
                try {
                    server.sync();
                    Toast.makeText(this, "Synced", Toast.LENGTH_SHORT).show();
                } catch (Exception e) {
                    Log.e(TAG, "btnSync: failed to sync", e);
                    showErrorMessage("Failed to sync", "An error occurred while syncing the server. Error: " + e.getMessage());
                }
            }).start();
        });

        btnSave.setOnClickListener((view) -> new Thread(() -> saveSettings()).start());
        btnDelete.setOnClickListener((view) -> deleteServer());


        pullSettings();

        filePickerLauncher = registerForActivityResult(
                new ActivityResultContracts.StartActivityForResult(),
                result -> {
                    Intent data = result.getData();
                    if (result.getResultCode() != Activity.RESULT_OK) {
                        Log.d(TAG, "openFilePickerToSendFileToServer: user canceled");
                        Toast.makeText(this, "File upload canceled.", Toast.LENGTH_SHORT).show();
                        return;
                    }

                    if (data == null) {
                        Log.w(TAG, "openFilePickerToSendFileToServer: no intent data");
                        Toast.makeText(this, "File upload failed, no selected file.", Toast.LENGTH_SHORT).show();
                        return;
                    }

                    if (null != data.getClipData()) {
                        for (int i = 0; i < data.getClipData().getItemCount(); i++) {
                            Uri uri = data.getClipData().getItemAt(i).getUri();
                            if (uri != null) {
                                String name = getFriendlyNameFromUri(uri);
                                Toast.makeText(this, "Sending \"" + name + "\".", Toast.LENGTH_SHORT).show();
                                server.sendFile(uri);
                            }
                        }
                    } else {
                        Uri uri = data.getData();
                        if (uri != null) {
                            server.sendFile(uri);
                        }
                    }
                }
        );
        folderPickerLauncher = registerForActivityResult(
                new ActivityResultContracts.StartActivityForResult(),
                result -> {
                    Intent data = result.getData();
                    if (result.getResultCode() != Activity.RESULT_OK) {
                        Log.d(TAG, "openFolderPickerToSetDestinationDirectory: user canceled");
                        Toast.makeText(this, "Canceled", Toast.LENGTH_SHORT).show();
                        return;
                    }

                    if (data == null) {
                        Log.w(TAG, "openFolderPickerToSetDestinationDirectory: no intent data");
                        Toast.makeText(this, "No selected folder", Toast.LENGTH_SHORT).show();
                        return;
                    }

                    Uri uri = data.getData();
                    if (isValidContentUri(uri)) {
                        getContentResolver().takePersistableUriPermission(uri, (Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION));
                        incomingFilesDirectoryUri = uri;
                        updateFileSharingSettings();
                    } else {
                        Toast.makeText(this, "Invalid content Uri", Toast.LENGTH_SHORT).show();
                    }
                }
        );
    }

    @Override
    public boolean onSupportNavigateUp() {
        onBackPressed();
        return true;
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        try {
            super.onActivityResult(requestCode, resultCode, data);
        } catch (Exception e) {
            Log.e(TAG, "onActivityResult: error!!", e);
            showErrorMessage("Unknown error", "An unknown error has been encountered.");
        }
    }

    /**
     * Opens a file picker dialog with the selected folder being set as the incoming files directory
     */
    private void openFolderPickerToSetDestinationDirectory() {
        Intent folderPicker = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
        folderPicker.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        folderPicker.putExtra(Intent.EXTRA_TITLE, "Set incoming files destination");
        folderPickerLauncher.launch(folderPicker);
    }

    /**
     * Opens a file picker dialog with the selected file being sent to the server
     */
    private void openFilePickerToSendFileToServer() {
        Intent filePickerIntent = new Intent(Intent.ACTION_GET_CONTENT);
        filePickerIntent.setType("*/*");
        filePickerIntent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, false);
        filePickerIntent.putExtra(Intent.EXTRA_TITLE, "Send a file to " + this.server.friendlyName + ".");
        filePickerLauncher.launch(filePickerIntent);
    }

    /**
     * Display an error message to the user
     * @param title Dialog title
     * @param message Dialog message
     */
    public void showErrorMessage(String title, String message) {
        WeakReference<ServerSettingsActivity> mActivityRef = new WeakReference<>(this);

        if (mActivityRef != null && mActivityRef.get() != null && !mActivityRef.get().isFinishing()) {
            AlertDialog.Builder alertBuilder = new AlertDialog.Builder(this);
            alertBuilder.setTitle(title);
            alertBuilder.setMessage(message);
            alertBuilder.setPositiveButton("Ok", (dialog, which) -> {
                // do stuff here?
            });

            alertBuilder.create().show();
        }
    }

    /**
     * Requests permission before doing an action
     * @param title Title of the dialog, query
     * @param message Dialog message, question
     * @param yesListener Event fired when the user hits "yes"
     */
    public void askForConfiguration(String title, String message, DialogInterface.OnClickListener yesListener) {
        AlertDialog.Builder builder = new AlertDialog.Builder(this);
        builder.setTitle(title).setMessage(message);

        builder.setPositiveButton("Yes", (dialog, id1) -> {
            try {
                yesListener.onClick(dialog, id1);
            } catch (Exception e) {
                Log.e(TAG, "askForConfiguration: error on running 'yes' action.", e);
                showErrorMessage("Unknown error", "An unknown error occurred.");
            }
        });
        builder.setNegativeButton("No", (dialog, id1) -> dialog.cancel());

        AlertDialog dialog = builder.create();
        dialog.show();
    }

    /**
     * Updates the notification settings buttons
     */
    private void updateNotificationSettings() {
        btnManageSyncedNotifications.setEnabled(chkNotificationsSync.isChecked());
    }

    /**
     * Updates the clipboard checkboxes and buttons
     */
    private void updateClipboardSettings() {
        boolean clipboardEnabled = chkClipboardEnable.isChecked();
        chkClipboardServerGet.setEnabled(clipboardEnabled);
        btnSendClipboard.setEnabled(clipboardEnabled);
        btnReceiveClipboard.setEnabled(clipboardEnabled);
    }

    /**
     * Updates the file sharing checkboxes and buttons
     */
    private void updateFileSharingSettings() {
        boolean fileSharingEnable = chkFileSharingEnable.isChecked();
        chkFileSharingAutoAcceptFiles.setEnabled(fileSharingEnable);
        chkFileSharingNotifyOnReceive.setEnabled(fileSharingEnable);
        chkFileSharingServerSet.setEnabled(fileSharingEnable);
        btnSendFile.setEnabled(fileSharingEnable);
        btnFileSharingManageDestination.setEnabled(fileSharingEnable);

        String folderName = getString(R.string.filesharing_destination_folder_location_placeholder,
                getFriendlyNameFromUri(incomingFilesDirectoryUri));
        txtFileSharingDestination.setText(folderName);
    }

    /**
     * Gets the folder name of a content uri
     * @param uri Uri to use
     * @return Friendly readable name
     */
    private String getFriendlyNameFromUri(Uri uri) {
        if (uri == null)
            return "";

        try  {
            DocumentFile documentFile = DocumentFile.fromTreeUri(MainActivity.Context, uri);
            if (documentFile == null)
                return "";

            if (documentFile.getParentFile() != null) {
                return documentFile.getParentFile().getName() + "/" + documentFile.getName();
            }
            return documentFile.getName();
        } catch (Exception e) {
            Log.e(TAG, "getFriendlyNameFromUri: error", e);
            return "";
        }
    }

    /**
     * Checks whether a content uri is valid or not (and we can access it)
     * @param contentUri Content uri to render?
     * @return Friendly file/folder name
     */
    private boolean isValidContentUri(Uri contentUri) {
        try {
            DocumentFile documentFile = DocumentFile.fromTreeUri(MainActivity.Context, contentUri);

            return documentFile.exists() && documentFile.canWrite();
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    /**
     * Updates the text fields
     */
    @SuppressLint("SetTextI18n")
    private void updateDetailsText() {
        String folderName = getString(R.string.filesharing_destination_folder_location_placeholder,
                getFriendlyNameFromUri(incomingFilesDirectoryUri));
        txtFileSharingDestination.setText(folderName);

        txtServerIpAddress.setText(getString(R.string.server_ip_address_title_placeholder) + this.server.ipAddress.toString());

        String websocketStatus = getString(R.string.server_websocket_status_connected);
        if (!this.server.getConnectionManager().isWebSocketConnected())
            websocketStatus = getString(R.string.server_websocket_status_disconnected);
        String websocketStatusText = getString(R.string.server_websocket_status_title_placeholder, websocketStatus);
        txtServerWebSocketConnected.setText(websocketStatusText);

        String pingTime = getString(R.string.server_ping_delay_title_placeholder,
                this.server.getConnectionManager().getLastPingDelay() / 1000 + "s");
        txtServerLastPingDelay.setText(pingTime);
    }


    /**
     * Set the initial state of the checkboxes, buttons, etc. Pull the settings from the server.
     */
    private void pullSettings() {
        try {
            chkNotificationsSync.setChecked(this.server.syncNotifications);
            updateNotificationSettings();

            chkClipboardEnable.setChecked(this.server.clipboardSettings.enabled);
            chkClipboardServerGet.setChecked(this.server.clipboardSettings.allowServerToGet);
            updateClipboardSettings();

            chkFileSharingEnable.setChecked(this.server.filesharingSettings.enabled);
            chkFileSharingAutoAcceptFiles.setChecked(!this.server.filesharingSettings.requireConfirmationOnServerUploads);
            chkFileSharingNotifyOnReceive.setChecked(this.server.filesharingSettings.notifyOnServerUpload);
            chkFileSharingServerSet.setChecked(this.server.filesharingSettings.allowServerToUpload);
            updateFileSharingSettings();


            boolean receivedFilesDirectoryValid = false;
            try {
                if (this.server.filesharingSettings.receivedFilesDirectory != null) {
                    Uri uri = Uri.parse(this.server.filesharingSettings.receivedFilesDirectory);
                    getContentResolver().takePersistableUriPermission(uri, (Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION));
                    receivedFilesDirectoryValid = isValidContentUri(uri);
                }

                if (!receivedFilesDirectoryValid) {
                    this.server.filesharingSettings.receivedFilesDirectory = "content://com.android.providers.downloads.documents/tree/downloads";
                }

                incomingFilesDirectoryUri = Uri.parse(this.server.filesharingSettings.receivedFilesDirectory);
            } catch (Exception ignored) {
                this.server.filesharingSettings.receivedFilesDirectory = "content://com.android.providers.downloads.documents/tree/downloads";
                incomingFilesDirectoryUri = Uri.parse("content://com.android.providers.downloads.documents/tree/downloads");
            }


            updateDetailsText();
        } catch (Exception e) {
            Log.e(TAG, "pullSettings: error occurred while pulling server settings", e);
            showErrorMessage("Unexpected error", "We're having trouble reading the server's settings. You may have to delete the server and repair.");
            finish();
        }
    }

    /**
     * Save current settings (on the page) to the server
     */
    private void saveSettings() {
        // Move the settings to the server, save
        this.server.syncNotifications = chkNotificationsSync.isChecked();

        this.server.clipboardSettings.enabled = chkClipboardEnable.isChecked();
        this.server.clipboardSettings.allowServerToGet = chkClipboardServerGet.isChecked();

        this.server.filesharingSettings.enabled = chkFileSharingEnable.isChecked();
        this.server.filesharingSettings.requireConfirmationOnServerUploads = !chkFileSharingAutoAcceptFiles.isChecked();
        this.server.filesharingSettings.notifyOnServerUpload = chkFileSharingNotifyOnReceive.isChecked();
        this.server.filesharingSettings.allowServerToUpload = chkFileSharingServerSet.isChecked();
        this.server.filesharingSettings.receivedFilesDirectory = incomingFilesDirectoryUri.toString();

        try {
            server.save();
            runOnUiThread(() -> Toast.makeText(this, "Settings saved", Toast.LENGTH_SHORT).show());
        } catch (IOException e) {
            Log.e(TAG, "saveSettings: failed to save to server", e);
            showErrorMessage("Failed to save", "Failed to save current settings. Error: " + e.getMessage());
        }
    }

    /**
     * Tells the MainActivity to delete this server
     */
    private void deleteServer() {
        askForConfiguration("Delete " + server.friendlyName + "?", "Are you sure you want to delete the server?", (dialog,id) -> {
            Intent intent = new Intent();
            intent.putExtra(Constants.EXTRA_SERVER_ID, server.serverId);
            setResult(Activity.RESULT_OK, intent);
            finish();
        });
    }
}