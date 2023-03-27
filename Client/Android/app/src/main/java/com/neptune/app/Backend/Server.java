package com.neptune.app.Backend;


import static android.content.Context.BATTERY_SERVICE;

import android.content.Intent;
import android.content.IntentFilter;
import android.os.BatteryManager;
import android.os.Build;
import android.util.Log;

import com.google.gson.JsonObject;
import com.google.gson.JsonParseException;
import com.neptune.app.Backend.Exceptions.FailedToPair;
import com.neptune.app.Backend.Exceptions.TooManyEventListenersException;
import com.neptune.app.Backend.Exceptions.TooManyEventsException;
import com.neptune.app.Backend.Interfaces.ICallback;
import com.neptune.app.Backend.Structs.APIDataPackage;
import com.neptune.app.MainActivity;


import java.io.File;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.TimeZone;
import java.util.UUID;

public class Server extends ServerConfig {
    private final String TAG;

    private ConnectionManager connectionManager;

    // When uploading a file, we can't actually send the file until server sends us a fileUUID.
    // So, to preserve the file path we're trying to upload we store the filepath as the value to the request id we send.
    private Map<String, String> fileRequestIdsToFilePaths = new HashMap<>();

    public Server(String serverId, ConfigurationManager configurationManager) throws JsonParseException, IOException {
        super(serverId, configurationManager);
        TAG = "Server-" + this.serverId.toString();
        Log.i(TAG, "Server(): " + serverId);
    }
    public Server(UUID serverId, ConfigurationManager configurationManager) throws JsonParseException, IOException {
        super(serverId.toString(), configurationManager);
        TAG = "Server-" + this.serverId.toString();
        Log.i(TAG, "Server(): " + serverId);
    }

    public Server(JsonObject jsonObject, ConfigurationManager configurationManager) throws JsonParseException, IOException {
        super(jsonObject.get("serverId").getAsString(), configurationManager);
        fromJson(jsonObject);
        TAG = "Server-" + this.serverId.toString();
        Log.i(TAG, "Server(): " + this.serverId.toString());
    }

    //

    /**
     * This will create the connection manager and initiate connection.
     * If the connection manager already exists, it'll check if we're connected. If not, we reconnect. If connected we return.
     * @throws FailedToPair Unable to pair to server
     */
    public void setupConnectionManager() throws FailedToPair {
        if (connectionManager != null) {
            if (!connectionManager.getHasNegotiated() && !connectionManager.isWebSocketConnected())
                connectionManager.initiateConnectionSync();
            return;
        }

        connectionManager = new ConnectionManager(this.ipAddress, this);
        try {
            connectionManager.EventEmitter.addListener("command", this.getCommandListener());
        } catch (TooManyEventListenersException | TooManyEventsException e) {
            // Literally how?
            e.printStackTrace();
        }

        Log.d(TAG, "setupConnectionManager: we did something");
        connectionManager.initiateConnectionSync();
    }

    /**
     * Creates the event listener callback. This should be used on "command" events from ConnectionManager.
     * @return Callback method
     */
    private ICallback getCommandListener() {
        return params -> {
            try {
                APIDataPackage apiDataPackage = null;
                if (params.length == 1) {
                    if (params[0] instanceof APIDataPackage)
                        apiDataPackage = (APIDataPackage) params[0];
                }
                if (apiDataPackage == null) {
                    Log.e(TAG + "-CommandListener", "Command event emitted, but invalid event data provided.");
                    return;
                }

                // Process commands here!
                String command = apiDataPackage.command.toLowerCase();
                if (command.equals("/api/v1/echo")) {
                    this.connectionManager.sendRequestAsync("/api/v1/echoed", apiDataPackage.getOriginalPacket().get("data"));

                } else if (command.equals("/api/v1/client/unpair")) {
                    unpair();

                } else if (command.equals("/api/v1/client/disconnect")) {
                    this.connectionManager.disconnect();

                } else if (command.equals("/api/v1/client/ping") && apiDataPackage.isJsonObject()) {
                    Date now = new Date();
                    SimpleDateFormat formatter = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");
                    formatter.setTimeZone(TimeZone.getTimeZone("UTC"));
                    String timestamp = formatter.format(now);

                    JsonObject pong = new JsonObject();
                    pong.addProperty("receivedAt", apiDataPackage.jsonObject().get("timestamp").toString());
                    pong.addProperty("timestamp", timestamp);
                    this.connectionManager.sendRequestAsync("/api/v1/server/pong", pong);

                // Gets!
                } else if (command.equals("/api/v1/client/configuration/get")) {
                    this.syncConfiguration(true);

                } else if (command.equals("/api/v1/client/battery/get")) {
                    this.sendBatteryInfo();

                } else if (command.equals("/api/v1/client/clipboard/get")) {
                    JsonObject response = new JsonObject();

                    if (clipboardSettings.enabled) {
                        if (clipboardSettings.allowServerToGet)
                            sendClipboard(true);
                        else {
                            response.addProperty("status", "getBlocked");
                            this.connectionManager.sendRequestAsync("/api/v1/client/clipboard/data", response);
                        }
                    } else {
                        response.addProperty("status", "clipboardSharingOff");
                        this.connectionManager.sendRequestAsync("/api/v1/client/clipboard/data", response);
                    }



                // Sets!
                } else if ((command.equals("/api/v1/client/clipboard/set") || command.equals("/api/v1/server/clipboard/data")) && apiDataPackage.isJsonObject()) {
                    boolean isResponse = command.equals("/api/v1/server/clipboard/data"); // Are they setting or did we request?
                    JsonObject response = new JsonObject();
                    if (this.clipboardSettings.enabled) {
                        if (this.clipboardSettings.allowServerToSet || isResponse) {
                            if (Clipboard.setClipboard(apiDataPackage.jsonObject()) && isResponse) {
                                response.addProperty("status", "success");
                                this.connectionManager.sendRequestAsync("/api/v1/client/clipboard/uploadStatus", response);
                            } else if (isResponse) {
                                response.addProperty("status", "failed");
                                response.addProperty("errorMessage", "Unknown client error");
                                this.connectionManager.sendRequestAsync("/api/v1/client/clipboard/uploadStatus", response);
                            }

                        } else if (isResponse) {
                            response.addProperty("status", "setBlocked");
                            this.connectionManager.sendRequestAsync("/api/v1/client/clipboard/uploadStatus", response);
                        }
                    } else if (isResponse) {
                        response.addProperty("status", "clipboardSharingOff");
                        this.connectionManager.sendRequestAsync("/api/v1/client/clipboard/uploadStatus", response);
                    }

                } else if ((command.equals("/api/v1/client/configuration/set") || command.equals("/api/v1/server/configuration/data")) && apiDataPackage.isJsonObject()) {
                    // Set notification, clipboard, filesharing enabled/disabled. DO NOT SET things like allowGet or allowUpload, etc



                // File stuff
                } else if (command.equals("/api/v1/client/filesharing/receive") && apiDataPackage.isJsonObject()) {
                    // Download a file! (preferably in a new thread!)
                    JsonObject data = apiDataPackage.jsonObject();
                    if (data.has("fileUUID") && data.has("authenticationCode")) {
                        String fileUUID = data.get("fileUUID").getAsString();
                        String authenticationCode = data.get("authenticationCode").getAsString();

                        // download file from "/api/v1/server/socket/" + connectionManager.getSocketUUID() + "/filesharing/" + fileUUID + "/download"
                        // you'll have to send a POST request with json data, the json data must include the authentication code under the name "authenticationCode"
                        // see api doc.
                    }

                } else if (command.equals("/api/v1/server/filesharing/upload/fileUUID") && apiDataPackage.isJsonObject()) {
                    // We got our file UUID, upload!
                    JsonObject data = apiDataPackage.jsonObject();
                    if (data.has("fileUUID") && data.has("requestId")
                            && fileRequestIdsToFilePaths.containsKey(data.get("requestId").getAsString())) {
                        String filePath = fileRequestIdsToFilePaths.get(data.get("requestId").getAsString());
                        String fileUUID = data.get("fileUUID").getAsString();

                        // upload file to "/api/v1/server/socket/" + connectionManager.getSocketUUID() + "/filesharing/" + fileUUID + "/upload"
                    }


                } else if (command.equals("/api/v1/server/filesharing/uploadStatus") && apiDataPackage.isJsonObject()) {
                    // Upload status
                    JsonObject data = apiDataPackage.jsonObject();
                    String status;
                    boolean wasApproved = false;

                    if (data.has("status"))
                        status = data.get("status").getAsString();
                    if (data.has("approved"))
                        wasApproved = data.get("approved").getAsBoolean();

                    // do something here if you want (send push notification? maybe a toast notification?)
                    // not a big worry!


                // Notification (activate/dismiss/update)
                } else if (command.equals("/api/v1/client/notifications/update")) {
                    if (apiDataPackage.isJsonObject()) {
                        JsonObject data = apiDataPackage.jsonObject();
                        String applicationPackage = data.get("applicationPackage").getAsString();
                        int notificationId = data.get("notificationId").getAsInt();

                        // Whether we're activating the notification (clicking it) or dismissing it
                        boolean activateNotification = (data.get("action").getAsString().equalsIgnoreCase("activate"));

                        String actionId = null; // If an input (button/text box) was activated (clicked), this would be the name of said input
                        String actionText = null; // If there was any text entered into the notification (pass this to the notification)
                        if (data.has("actionParameters")) {
                            JsonObject actionParameters = data.get("actionParameters").getAsJsonObject();
                            if (actionParameters.has("actionId"))
                                actionId = actionParameters.get("actionId").getAsString();
                            if (actionParameters.has("actionText"))
                                actionText = actionParameters.get("actionText").getAsString();
                        }

                        if (activateNotification) {
                            // Click the notification / button (if actionId present and valid)
                            MainActivity.notificationManager.activateNotification(notificationId, actionId, actionText);

                        } else {
                            // Dismiss the notification
                            MainActivity.notificationManager.dismissNotification(notificationId);
                        }
                    } else {
                        // do array processing
                    }
                } else if (command.equals("/api/v1/client/notifications/getAll")) {
                    // Return notifications, check ignore list / search list

                }

            } catch (Exception e) {
                Log.e(TAG, "Error processing command!");
                Log.e(TAG, e.getMessage());
                e.printStackTrace();
            }
        };
    }

    public ConnectionManager getConnectionManager() {
        return this.connectionManager;
    }

    /**
     * Send the battery data to the server asynchronously.
     */
    public void sendBatteryInfo() {
        try {
            if (connectionManager == null) {
                try {
                    this.setupConnectionManager();
                } catch (FailedToPair e) {
                    e.printStackTrace();
                    return;
                }

                if (connectionManager == null)
                    return;
            }

            BatteryManager bm = (BatteryManager) MainActivity.Context.getSystemService(BATTERY_SERVICE);
            Intent bi = MainActivity.Context.registerReceiver(null, new IntentFilter(Intent.ACTION_BATTERY_CHANGED));

            int level = bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY);

            String chargerType = "discharging";
            int status = bi.getIntExtra(BatteryManager.EXTRA_STATUS, 0);
            if (status != BatteryManager.BATTERY_STATUS_DISCHARGING) {
                if (status == BatteryManager.BATTERY_PLUGGED_AC)
                    chargerType = "AC";
                else if (status == BatteryManager.BATTERY_PLUGGED_USB)
                    chargerType = "USB";
                else if (status == BatteryManager.BATTERY_PLUGGED_WIRELESS)
                    chargerType = "wireless";
                else
                    chargerType = "charging";
            }

            float temperature = ((float) bi.getIntExtra(BatteryManager.EXTRA_TEMPERATURE, 0)) / 10;

            ///api/v1/client/battery/info
            JsonObject batteryData = new JsonObject();
            batteryData.addProperty("level", level);
            batteryData.addProperty("chargerType", chargerType);
            batteryData.addProperty("temperature", temperature);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                long remandingTime = bm.computeChargeTimeRemaining();
                if (remandingTime != -1)
                    batteryData.addProperty("batteryTimeRemaining", remandingTime / 1000);
            }
            connectionManager.sendRequestAsync("/api/v1/client/battery/info", batteryData);
        } catch (Exception e) {
            e.printStackTrace();
            Log.e(TAG, "sendBatteryInfo: failure");
        }
    }

    public void sendNotification(NeptuneNotification notification, SendNotificationAction action) {
        try {
            if (connectionManager == null) {
                try {
                    this.setupConnectionManager();
                } catch (FailedToPair e) {
                    e.printStackTrace();
                    return;
                }

                if (connectionManager == null)
                    return;
            }

            if (!this.syncNotifications) {
                return;
            }

            if (connectionManager.getHasNegotiated()) {
                if (!notificationBlacklistApps.contains(notification.applicationPackageName)) {
                    JsonObject notificationData = notification.toJson();
                    if (notificationData.has("action") && action != SendNotificationAction.CREATE) {
                        notificationData.remove("action");
                        if (action == SendNotificationAction.DELETE) {
                            notificationData.addProperty("action", "delete");
                        } else if (action == SendNotificationAction.UPDATE) {
                            notificationData.addProperty("action", "update");
                        } else {
                            notificationData.addProperty("action", "create"); // okay?
                        }
                    }

                    connectionManager.sendRequestAsync("/api/v1/server/notifications/send", notificationData);
                }
            }

        } catch (JsonParseException e) {
            e.printStackTrace();
        }
    }

    /**
     * Sends shared configuration information to the server.
     * (Pushes some config items to the server)
     * @param isResponse Whether or not to send the request to /api/v1/client/configuration/data (true) end point or /api/v1/server/configuration/set (false) one.
     */
    public void syncConfiguration(boolean isResponse) {
        JsonObject data = new JsonObject();

        JsonObject notificationSettings = new JsonObject();
        notificationSettings.addProperty("enabled", this.syncNotifications);

        JsonObject clipboardSettings = new JsonObject();
        clipboardSettings.addProperty("enabled", this.clipboardSettings.enabled);
        clipboardSettings.addProperty("allowServerToSet", this.clipboardSettings.allowServerToSet);
        clipboardSettings.addProperty("allowServerToGet", this.clipboardSettings.allowServerToGet);
        clipboardSettings.addProperty("synchronizeClipboardToServer", this.clipboardSettings.synchronizeClipboardToServer);

        JsonObject fileSharingSettings = new JsonObject();
        fileSharingSettings.addProperty("enabled", this.filesharingSettings.enabled);
        fileSharingSettings.addProperty("allowServerToUpload", this.filesharingSettings.allowServerToUpload);
        fileSharingSettings.addProperty("allowServerToDownload", this.filesharingSettings.allowServerToDownload);


        data.add("notificationSettings", notificationSettings);
        data.add("clipboardSettings", clipboardSettings);
        data.add("fileSharingSettings", fileSharingSettings);

        String apiUrl = "/api/v1/server/configuration/set";
        if (isResponse)
            apiUrl = "/api/v1/client/configuration/data";
        this.connectionManager.sendRequestAsync(apiUrl, data);
    }
    public void syncConfiguration() { syncConfiguration(false); }

    public void sendNotification(NeptuneNotification notification) {
        this.sendNotification(notification, SendNotificationAction.CREATE);
    }


    /**
     * Sends our clipboard to the server.
     * @param isResponse Whether or not to send the request to /api/v1/server/clipboard/set (false, default) end point or /api/v1/client/clipboard/data (true) one.
     */
    public void sendClipboard(boolean isResponse) {
        if (!this.clipboardSettings.enabled)
            return;

        JsonObject clipboardData = Clipboard.getClipboard();

        String apiUrl = "/api/v1/server/clipboard/set";
        if (isResponse)
            apiUrl = "/api/v1/client/clipboard/data";
        this.connectionManager.sendRequestAsync("/api/v1/server/clipboard/set", clipboardData);
    }
    public void sendClipboard() { sendClipboard(false); }

    public void requestClipboard() {
        if (!this.clipboardSettings.enabled || !this.clipboardSettings.allowServerToSet)
            return;
        this.connectionManager.sendRequestAsync("/api/v1/server/clipboard/get", new JsonObject());
    }

    /**
     * Uploads a file to the server (in two stages)
     *
     * First stage is this method, asks the server to create a new fileUUID for upload.
     * The server then sends us a request with fileUUID that will be used in the URL the file will be uploaded to.
     * We send a request id with our first request and the server sends it back. Because of that, we remember the file to upload.
     * @param filePath
     * @throws FileNotFoundException
     */
    public void sendFile(String filePath) throws FileNotFoundException, SecurityException {
        if (!filesharingSettings.enabled) {
            return;
        }

        File file = new File(filePath);
        if (!file.exists() || !file.isFile())
            throw new FileNotFoundException("File at \"" + filePath + "\" does not exist.");
        if (!file.canRead())
            throw new SecurityException("Cannot read file at " + filePath + ".");

        String requestId = UUID.randomUUID().toString();
        if (fileRequestIdsToFilePaths == null)
            fileRequestIdsToFilePaths = new HashMap<>(1);

        fileRequestIdsToFilePaths.put(requestId, filePath);
        JsonObject uploadRequest = new JsonObject();
        uploadRequest.addProperty("requestId", requestId);
        uploadRequest.addProperty("filename", file.getName());
        this.connectionManager.sendRequestAsync("/api/v1/server/filesharing/upload/newFileUUID", uploadRequest);
    }

    public double ping() {
        return this.connectionManager.ping();
    }


    public void unpair() {
        if (pairKey != null) {
            if (!pairKey.isEmpty()) {
                JsonObject data = new JsonObject();
                data.addProperty("pairId", this.pairId.toString());
                data.addProperty("clientId", MainActivity.ClientConfig.clientId.toString());
                this.connectionManager.sendRequestAsync("/api/v1/server/unpair", data);
            }
        }
        this.connectionManager.destroy(true);
        this.delete();
    }

    public void pair() throws FailedToPair {
        if (connectionManager == null) {
            setupConnectionManager();
        }

        if (!connectionManager.getHasNegotiated())
            connectionManager.initiateConnection();

        connectionManager.pair();
    }

    enum SendNotificationAction {
        CREATE,
        DELETE,
        UPDATE,
    }

}
