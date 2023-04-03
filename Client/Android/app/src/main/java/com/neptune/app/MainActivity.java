package com.neptune.app;

//Create a method that searches the ServerManager's Map of servers and compare the serverId with the textView that we wanna delete.
//Use either list views to make a lists of the names and edit buttons, or create a new TextView and ImageView for each new device. Depending on what you choose
// you will have to delete the entries from the list or the entire views when removing a device.

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.UiModeManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.ColorFilter;
import android.graphics.drawable.ColorDrawable;
import android.graphics.drawable.Drawable;
import android.net.Uri;
import android.net.wifi.WifiManager;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.text.TextUtils;
import android.text.format.Formatter;
import android.util.Log;
import android.view.Menu;
import android.view.MenuItem;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ImageButton;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.content.res.AppCompatResources;
import androidx.core.app.ActivityCompat;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;
import androidx.core.graphics.drawable.IconCompat;

import com.neptune.app.Backend.ClientConfig;
import com.neptune.app.Backend.ConfigurationManager;
import com.neptune.app.Backend.Exceptions.InvalidIPAddress;
import com.neptune.app.Backend.IPAddress;
import com.neptune.app.Backend.NotificationListenerService;
import com.neptune.app.Backend.NotificationManager;
import com.neptune.app.Backend.Server;
import com.neptune.app.Backend.ServerManager;

import java.util.HashMap;
import java.util.UUID;

public class MainActivity extends AppCompatActivity implements RenameDialog.RenameDialogListener {
    private static final String TAG = "MainActivity";

    private int aboutShownCount = 0;

    public static ServerManager serverManager;
    public static com.neptune.app.Backend.NotificationManager notificationManager;
    private ConfigurationManager configurationManager;

    public static ClientConfig ClientConfig;

    @SuppressLint("StaticFieldLeak")
    public static Context Context;


    private AlertDialog addDialog;
    private LinearLayout addLine;
    private TextView lblFriendlyName;
    private final HashMap<Server, View> serversShown = new HashMap<>();

    private ActivityResultLauncher<Intent> serverSettingsActivityResults;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Context = getApplicationContext();

        setContentView(R.layout.activity_main);

        Button addServer = findViewById(R.id.addDev);
        addLine = findViewById(R.id.container);
        //notifyListTest = findViewById(R.id.notifTest);
        buildAddDialog();

        // Get configurationManager
        configurationManager = new ConfigurationManager();
        try {
            ClientConfig = new ClientConfig("clientConfiguration.json", configurationManager);
            ClientConfig.save();
            notificationManager = new NotificationManager();
            serverManager = new ServerManager(ClientConfig, configurationManager);
            Server[] servers = serverManager.getServers();
            for (Server server : servers) {
                addServerToList(server);
            }
            serverManager.connectToServers(); // Connects all servers up
        } catch (Exception e) {
            e.printStackTrace();
            // Failed to load main config! First run I guess

            showErrorMessage("Failed to load configuration/server manager",
                    "There was an unknown error loading the client configuration file or setting up the server manager.\n" +
                    "Please report this to the developer (hopefully not you)\n\n" +
                    "error.getMessage(): " + e.getMessage());
        }

        // Setup MainActivity
        addServer.setOnClickListener(view -> addDialog.show());

        lblFriendlyName = findViewById(R.id.lblMyFriendlyName);
        lblFriendlyName.setText(getString(R.string.main_activity_friendly_name, ClientConfig.friendlyName));
        TextView lblMyIP = findViewById(R.id.lblMyIP);
        try {
            WifiManager wm = (WifiManager) getApplicationContext().getSystemService(WIFI_SERVICE);
            String ip = Formatter.formatIpAddress(wm.getConnectionInfo().getIpAddress());
            lblMyIP.setText(getString(R.string.main_activity_device_ip, ip));
        } catch (Exception err) {
            err.printStackTrace();
            lblMyIP.setVisibility(View.GONE);
        }

        TextView lblVersion = findViewById(R.id.lblVersion);
        lblVersion.setText(getString(R.string.main_activity_version, BuildConfig.VERSION_NAME));

        if (!isNotificationServiceEnabled()) {
            startActivity(new Intent(MainActivity.this, PermissionsActivity.class));
        }

        // Start notification listener
        startService(new Intent(this, NotificationListenerService.class));

        // Activity results for settings page
        serverSettingsActivityResults = registerForActivityResult(
            new ActivityResultContracts.StartActivityForResult(),
            result -> {
                if (result.getResultCode() == Activity.RESULT_OK) {
                    Intent data = result.getData();
                    if ((data != null && data.hasExtra(Constants.EXTRA_SERVER_ID))) {
                        try {
                            String uid = data.getStringExtra(Constants.EXTRA_SERVER_ID);
                            UUID serverUUID = UUID.fromString(uid);
                            Server server = serverManager.getServer(serverUUID);
                            String name = server.friendlyName;
                            server.unpair();
                            removeServer(server, serversShown.get(server));
                            Toast.makeText(Context, "Deleted " + name, Toast.LENGTH_SHORT).show();
                        } catch (Exception e) {
                            Log.e(TAG, "onActivityResult: failed to delete server", e);
                            showErrorMessage("Failed to delete server", "Failed to unpair and delete the server. Please select delete from the list.");
                        }
                    }
                }
            }
        );

        // File permission check
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.WRITE_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
            // Permission is not granted
            // Should we show an explanation?
            if (ActivityCompat.shouldShowRequestPermissionRationale(this, Manifest.permission.WRITE_EXTERNAL_STORAGE)) {
                showErrorMessage("Cannot save files",
            "We need file access permissions in order to receive files from servers. " +
                    "Click \"Ok\" and \"Allow\" to permit this.",
                    (dialog, id) -> ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.WRITE_EXTERNAL_STORAGE},1));

            } else {
                // No explanation needed, request the permission
                ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.WRITE_EXTERNAL_STORAGE},1);
            }
        }

        // Setup notification channels
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            android.app.NotificationManager notificationManager = getSystemService(android.app.NotificationManager.class);

            NotificationChannel incomingChannel = new NotificationChannel(Constants.INCOMING_FILES_NOTIFICATION_CHANNEL_ID,
                    Constants.INCOMING_FILES_NOTIFICATION_CHANNEL_NAME,
                Constants.INCOMING_FILES_NOTIFICATION_CHANNEL_IMPORTANCE);
            incomingChannel.setDescription(Constants.INCOMING_FILES_NOTIFICATION_CHANNEL_DESCRIPTION);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                incomingChannel.setAllowBubbles(false);
            }
            incomingChannel.setLockscreenVisibility(Notification.VISIBILITY_PRIVATE);
            notificationManager.createNotificationChannel(incomingChannel);

            NotificationChannel uploadChannel = new NotificationChannel(Constants.UPLOAD_FILES_NOTIFICATION_CHANNEL_ID,
                    Constants.UPLOAD_FILES_NOTIFICATION_CHANNEL_NAME,
                    Constants.UPLOAD_FILES_NOTIFICATION_CHANNEL_IMPORTANCE);
            uploadChannel.setDescription(Constants.UPLOAD_FILES_NOTIFICATION_CHANNEL_DESCRIPTION);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q)
                uploadChannel.setAllowBubbles(false);
            uploadChannel.setLockscreenVisibility(Notification.VISIBILITY_PRIVATE);
            notificationManager.createNotificationChannel(uploadChannel);
        }
    }

    /**
     * Creates a new notification
     * @param channelId Channel id
     * @param title Notification title
     * @param text Notification body
     * @param icon Custom notification icon
     * @return Notification builder, you can more or send it out
     */
    public static NotificationCompat.Builder createBaseNotification(String channelId, String title, String text, IconCompat icon) {
        NotificationCompat.Builder builder = new NotificationCompat.Builder(Context.getApplicationContext(), channelId);
        builder.setContentTitle(title);
        builder.setContentText(text);
        builder.setSmallIcon((icon == null)? IconCompat.createWithResource(Context.getApplicationContext(), R.drawable.ic_launcher_foreground) : icon);

        return builder;
    }

    /**
     * Creates a new notification
     * @param channelId Channel id
     * @param title Notification title
     * @param text Notification body
     * @return Notification builder, you can more or send it out
     */
    public static NotificationCompat.Builder createBaseNotification(String channelId, String title, String text) {
        return createBaseNotification(channelId,
            title,
            text,
            IconCompat.createWithResource(Context.getApplicationContext(), R.drawable.ic_launcher_foreground));
    }

    public static int lastNotificationId = 0;

    /**
     * Gets the last notification id so everyone has a unique id
     * @return New notification id
     */
    public static int getNewNotificationId() {
        lastNotificationId++;
        return lastNotificationId;
    }

    /**
     * Sends out a notification
     * @param notificationId Id of the notification
     * @param notification Notification builder to push out
     */
    public static void pushNotification(int notificationId, NotificationCompat.Builder notification) {
        NotificationManagerCompat notificationManager = NotificationManagerCompat.from(Context);
        notificationManager.notify(notificationId, notification.build());
    }

    /**
     * Sends out a notification
     * @param notification Notification builder to push out
     */
    public static void pushNotification(NotificationCompat.Builder notification) {
        NotificationManagerCompat notificationManager = NotificationManagerCompat.from(Context);
        notificationManager.notify(lastNotificationId, notification.build());
        lastNotificationId++;
    }

    /**
     * Checks whether or not the NotificationListenerService has bind permissions
     * @return We can listen for notifications
     */
    public static boolean isNotificationServiceEnabled() {
        try {
            String enabledNotificationListeners = Settings.Secure.getString(Context.getContentResolver(), "enabled_notification_listeners");
            if (TextUtils.isEmpty(enabledNotificationListeners))
                return false;

            String packageName = Context.getPackageName();
            ComponentName serviceComponent = new ComponentName(Context, NotificationListenerService.class);
            String serviceComponentName = serviceComponent.flattenToString();

            String[] listeners = enabledNotificationListeners.split("/");
            for (String listener : listeners)
                if (listener.equals(serviceComponentName) || listener.equals(serviceComponent.flattenToShortString()) || listener.contains(packageName))
                    return true;

            listeners = enabledNotificationListeners.split(":");
            for (String listener : listeners)
                if (listener.equals(serviceComponentName) || listener.equals(serviceComponent.flattenToShortString()) || listener.contains(packageName))
                    return true;

            return false;
        } catch (Exception ignored) {
            return false;
        }
    }

    // Create the top menu
    @Override
    public boolean onCreateOptionsMenu(Menu menu) {
        getMenuInflater().inflate(R.menu.main_menu, menu);
        return true;
    }

    @Override
    public boolean onOptionsItemSelected(MenuItem item) {
        int id = item.getItemId();

        if (id == R.id.menu_rename_client) {
            renameClientDialog();
        } else if (id == R.id.menu_about) {
            // Get app name and version from manifest
            String appName = getString(R.string.app_name);
            String versionName = BuildConfig.VERSION_NAME;
            AlertDialog.Builder builder = new AlertDialog.Builder(this);
            builder.setTitle("About " + appName)
                    .setMessage("Version " + versionName + "\n\nU(of)SC Capstone Project by:" +
                            "\nMatthew Sprinkle\nWill Amos\nRidge Johnson\nCody Newberry" +
                            "\n\nVisit our GitHub page for more information.");

            builder.setNegativeButton("View on GitHub", (dialog, id12) -> {
                Intent browserIntent = new Intent(Intent.ACTION_VIEW, Uri.parse("https://github.com/SCCapstone/Neptune"));
                startActivity(browserIntent);
            });
            builder.setPositiveButton("Okay", (dialog, id1) -> dialog.cancel());

            AlertDialog dialog = builder.create();
            dialog.show();

            if (aboutShownCount >= 5 && aboutShownCount < 15) {
                Toast.makeText(Context, "🌊King Neptune🌊", Toast.LENGTH_SHORT).show();
            } else if (aboutShownCount >= 15) {
                Toast.makeText(Context, "Stop clicking the about window :)", Toast.LENGTH_LONG).show();
            }

            aboutShownCount++;
        }

        return super.onOptionsItemSelected(item);
    }



    // Helper methods


    /**
     * This method builds the add dialog so that when a user wants to add a server, it is able to be used.
     */
    private void buildAddDialog() {
        AlertDialog.Builder builder = new AlertDialog.Builder(this);
        View view = getLayoutInflater().inflate(R.layout.add_dialog, null);

        final EditText nameField = view.findViewById(R.id.nameEdit);
        final EditText ipAddressField = view.findViewById(R.id.ipEdit);

        builder.setView(view);
        builder.setTitle("Enter name")
                .setPositiveButton("OK", (dialog, which) -> {
                    try {
                        String name = nameField.getText().toString();
                        String ipAddress = ipAddressField.getText().toString();
                        nameField.setText("");
                        ipAddressField.setText("");

                        Thread thread = new Thread(() -> addServer(name, ipAddress));
                        thread.setName("ServerAdder-" + name);
                        thread.start();
                    } catch (Exception e) {
                        e.printStackTrace();
                        showErrorMessage("Unable to add server", "Error encountered pairing with new server: " + e.getMessage());
                    }
                })
                .setNegativeButton("Cancel", (dialog, which) -> {

                });

        addDialog = builder.create();
    }

    /**
     * This method adds an item to the list of servers and makes it appear on the screen for the user to interact with. It sets the name and ip based on user input.
     * It also has the onClickListeners for one of the delete buttons for a server and the edit name button. If the device name is clicked, the user is sent to another
     * activity filled with settings about the specific server.
    */
    public void addServerToList(Server server) {
        if (server == null)
            return;

        final View view = getLayoutInflater().inflate(R.layout.server_item_line, null);

        //public Config config
        TextView serverName = view.findViewById(R.id.server_name);
        ImageButton serverSyncButton = view.findViewById(R.id.server_item_sync);
        ImageButton serverSyncIssueButton = view.findViewById(R.id.server_item_sync_issue);
        ProgressBar serverSyncProgress = view.findViewById(R.id.server_item_sync_progress);
        ImageButton serverDeleteButton = view.findViewById(R.id.server_item_delete);
        ProgressBar serverDeleteProgress = view.findViewById(R.id.server_item_delete_progress);

        serverName.setText(server.friendlyName);
        serverName.setOnClickListener(view1 -> {
            Intent serverSettingsActivity = new Intent(MainActivity.this, ServerSettingsActivity.class);
            String id = server.serverId.toString();
            serverSettingsActivity.putExtra(Constants.EXTRA_SERVER_ID, id);
            serverSettingsActivityResults.launch(serverSettingsActivity);
        });

        View.OnClickListener syncButtonListener = v -> new Thread(() -> {
            try {
                hideOrShowImageButtonProgressBar(serverSyncButton, serverSyncProgress, false);
                runOnUiThread(() -> serverSyncIssueButton.setVisibility(View.GONE));
                Log.i("MainActivity", "Syncing with " + server.friendlyName);
                server.sync();

                if (server.getConnectionManager().isConnected()) {
                    hideOrShowImageButtonProgressBar(serverSyncButton, serverSyncProgress, true);
                    runOnUiThread(() -> serverSyncIssueButton.setVisibility(View.GONE));
                } else {
                    hideOrShowImageButtonProgressBar(serverSyncIssueButton, serverSyncProgress, true);
                    runOnUiThread(() -> serverSyncButton.setVisibility(View.GONE));
                }
            } catch (Exception e) {
                hideOrShowImageButtonProgressBar(serverSyncIssueButton, serverSyncProgress, true);
                runOnUiThread(() -> serverSyncProgress.setVisibility(View.GONE));
            }
        }).start();

        serverSyncButton.setOnClickListener(syncButtonListener);
        serverSyncIssueButton.setOnClickListener(syncButtonListener);

        try {
            server.EventEmitter.addListener(Constants.SERVER_EVENT_CONFIGURATION_UPDATE, (objects) -> {
                runOnUiThread(() -> serverName.setText(server.friendlyName));
            });
            server.EventEmitter.addListener("connecting", (objects) -> {
                hideOrShowImageButtonProgressBar(serverSyncButton, serverSyncProgress, false);
                runOnUiThread(() -> serverSyncIssueButton.setVisibility(View.GONE));
            });
            server.EventEmitter.addListener("connected", (objects) -> {
                hideOrShowImageButtonProgressBar(serverSyncButton, serverSyncProgress, true);
                runOnUiThread(() -> serverSyncIssueButton.setVisibility(View.GONE));
            });
            server.EventEmitter.addListener("connection-failed", (objects) -> {
                hideOrShowImageButtonProgressBar(serverSyncIssueButton, serverSyncProgress, true);
                runOnUiThread(() -> serverSyncProgress.setVisibility(View.GONE));
            });
        } catch (Exception e) {
            e.printStackTrace();
        } // whatever


        //Deletes the selected server upon clicking the related ImageView.
        serverDeleteButton.setOnClickListener(v -> {
            try{
                hideOrShowImageButtonProgressBar(serverDeleteButton, serverDeleteProgress, true);

                askForConfiguration("Delete " + server.friendlyName + "?", "Are you sure you want to delete the server?", (dialog,id) -> {
                    String name = server.friendlyName;
                    removeServer(server, view);
                    Log.i(TAG, "User deleted server: " + name);
                    Toast.makeText(Context, "Deleted " + name, Toast.LENGTH_SHORT).show();
                });
            } catch (Exception e) {
                e.printStackTrace();
                showErrorMessage("Failed to remove server", e.getMessage());
            } finally {
                hideOrShowImageButtonProgressBar(serverDeleteButton, serverDeleteProgress, true);
            }
        });

        addLine.addView(view);
        serversShown.put(server, view);
    }

    /**
     * The server line has ImageButtons and ProgressBars for the sync/delete section. This allows a quick and easy way to set which is visible.
     * @param button The button
     * @param progressBar The progress bar
     * @param showButton If the button is visible and the progress is not, or vice-versa
     */
    private void hideOrShowImageButtonProgressBar(ImageButton button, ProgressBar progressBar, boolean showButton) {
        runOnUiThread(() -> {
            button.setVisibility(showButton ? View.VISIBLE : View.GONE);
            progressBar.setVisibility(!showButton ? View.VISIBLE : View.GONE);
        });
    }

    /**
     * Open the dialog box for renaming the client.
     */
    private void renameClientDialog() {
        RenameDialog renameDialog = new RenameDialog(Constants.RENAME_DIALOG_CLIENT_NAME, "Client's friendly name:", ClientConfig.friendlyName);
        renameDialog.show(getSupportFragmentManager(), "rename dialog");
    }

    //Method to change the name of the client and update it in both the client and server config files.
    @Override
    public void processRenameDialog(String id, String text) {
        try {

            if (id.equals(Constants.RENAME_DIALOG_CLIENT_NAME)) {
                lblFriendlyName.setText(text);
                Log.i(TAG, "Updated name from " + ClientConfig.friendlyName + " to " + text);
                ClientConfig.friendlyName = text;
                ClientConfig.save();

                Server[] servers = serverManager.getServers();
                for (Server server : servers)
                    server.syncConfiguration();
            }

        } catch (Exception ignored) {
            Log.e(TAG, "Failed to process rename dialog, id: " + id + ". Text: " + text);
        }
    }


    public void showErrorMessage(String title, String message, DialogInterface.OnClickListener okayListener) {
        AlertDialog.Builder alertBuilder = new AlertDialog.Builder(this);
        alertBuilder.setTitle(title);
        alertBuilder.setMessage(message);
        alertBuilder.setPositiveButton("Ok", okayListener);
        alertBuilder.create().show();
    }
    public void showErrorMessage(String title, String message) {
        showErrorMessage(title, message, (dialog, which) -> {
            // do stuff here?
        });
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

    private void addServer(String name, String ipAddress) {
        Server server = null;
        try {
            // Later we need to get the UUID from the server via a HTTP request or something..
            // Or at the very least rename the config file to the real UUID
            server = new Server(UUID.randomUUID(), configurationManager);
            server.ipAddress = new IPAddress(ipAddress, 25560);
            server.friendlyName = name;
            server.save();
            server.setupConnectionManager();
            serverManager.addServer(server);
            serverManager.saveServers();

            Server finalServer = server;
            runOnUiThread(() -> addServerToList(finalServer));
        } catch (InvalidIPAddress e) {
            if (server != null)
                server.delete();
            runOnUiThread(() -> showErrorMessage("Invalid IP address", "You entered an invalid IP address."));
        } catch (Exception e) {
            e.printStackTrace();
            if (server != null)
                server.delete();
            runOnUiThread(() -> showErrorMessage("Failed to pair device", e.getMessage()));
        }
    }

    //Removes the selected server from the ListView of servers on the MainActivity screen and from the list of all servers.
    public void removeServer(Server s, View v) {
        try {
            serverManager.removeServer(s);
            addLine.removeView(v);
            serversShown.remove(s);
        } catch (Exception ignored) {}
    }
}