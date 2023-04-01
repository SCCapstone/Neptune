package com.neptune.app.Backend;


import static android.content.Context.BATTERY_SERVICE;

import android.content.Intent;
import android.content.IntentFilter;
import android.database.Cursor;
import android.net.Uri;
import android.os.BatteryManager;
import android.os.Build;
import android.os.Environment;
import android.provider.OpenableColumns;
import android.util.Log;

import com.google.gson.JsonObject;
import com.google.gson.JsonParseException;
import com.neptune.app.Backend.Exceptions.FailedToPair;
import com.neptune.app.Backend.Exceptions.TooManyEventListenersException;
import com.neptune.app.Backend.Exceptions.TooManyEventsException;
import com.neptune.app.Backend.Interfaces.ICallback;
import com.neptune.app.Backend.Structs.APIDataPackage;
import com.neptune.app.MainActivity;


import java.io.DataOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.MalformedURLException;
import java.net.URL;
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
    private Map<String, Uri> fileRequestIdsToFilePaths = new HashMap<>();

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
                    JsonObject data = apiDataPackage.jsonObject();
                    if (data.has("notificationSettings") && data.get("notificationSettings").isJsonObject()) {
                        JsonObject notificationSettings = data.get("notificationSettings").getAsJsonObject();
                        if (notificationSettings.has("enabled")) {
                            boolean serverNotificationEnabledSetting = notificationSettings.get("enabled").getAsBoolean();
                            this.syncNotifications = serverNotificationEnabledSetting;
                        }
                    }

                    if (data.has("clipboardSettings") && data.get("clipboardSettings").isJsonObject()) {
                        JsonObject clipboardSettings = data.get("clipboardSettings").getAsJsonObject();
                        if (clipboardSettings.has("enabled")) {
                            boolean serverClipboardEnabledSetting = clipboardSettings.get("enabled").getAsBoolean();
                            if (serverClipboardEnabledSetting == false) {
                                this.clipboardSettings.enabled = false; // Only allow remote to disable
                            }
                        }

                        if (clipboardSettings.has("synchronizeClipboardToClient") && clipboardSettings.get("synchronizeClipboardToClient").isJsonObject()) {
                            // For parity
                            this.clipboardSettings.synchronizeClipboardToClient = clipboardSettings.get("synchronizeClipboardToClient").getAsBoolean();
                        }
                    }

                    if (data.has("fileSharingSettings") && data.get("fileSharingSettings").isJsonObject()) {
                        JsonObject fileSharingSettings = data.get("fileSharingSettings").getAsJsonObject();
                        if (fileSharingSettings.has("enabled")) {
                            boolean serverFilesharingEnabledSetting = fileSharingSettings.get("enabled").getAsBoolean();
                            if (serverFilesharingEnabledSetting == false) {
                                this.filesharingSettings.enabled = false; // Only allow remote to disable
                            }
                        }
                    }

                    if (data.has("friendlyName") && data.get("friendlyName").isJsonPrimitive()) {
                        this.friendlyName = data.get("friendlyName").getAsString();
                    }


                // File stuff
                } else if (command.equals("/api/v1/client/filesharing/receive") && apiDataPackage.isJsonObject()) {
                    // Download a file! (preferably in a new thread!)
                    JsonObject data = apiDataPackage.jsonObject();
                    if (data.has("fileUUID")
                            && data.has("authenticationCode")
                            && data.has("fileName")) {
                        String fileUUID = data.get("fileUUID").getAsString();
                        String authenticationCode = data.get("authenticationCode").getAsString();
                        String fileName = data.get("fileName").getAsString();

                        // download file from "/api/v1/server/socket/" + connectionManager.getSocketUUID() + "/filesharing/" + fileUUID + "/download"
                        // you'll have to send a POST request with json data, the json data must include the authentication code under the name "authenticationCode"
                        // see api doc.
                        downloadFile(fileUUID, authenticationCode, fileName);
                    }

                } else if (command.equals("/api/v1/server/filesharing/upload/fileuuid") && apiDataPackage.isJsonObject()) {
                    // We got our file UUID, upload!
                    JsonObject data = apiDataPackage.jsonObject();
                    if (data.has("fileUUID")
                            && data.has("requestId")
                            && data.has("authenticationCode")
                            && fileRequestIdsToFilePaths.containsKey(data.get("requestId").getAsString())) {

                        Uri filePath = fileRequestIdsToFilePaths.get(data.get("requestId").getAsString());
                        String fileUUID = data.get("fileUUID").getAsString();
                        String authenticationCode = data.get("authenticationCode").getAsString();

                        // upload file to "/api/v1/server/socket/" + connectionManager.getSocketUUID() + "/filesharing/" + fileUUID + "/upload"
                        uploadFile(fileUUID, authenticationCode, filePath);
                    }


                } else if (command.equals("/api/v1/server/filesharing/uploadstatus") && apiDataPackage.isJsonObject()) {
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
                        String notificationId = data.get("notificationId").getAsString();

                        // Whether we're activating the notification (clicking it) or dismissing it
                        boolean activateNotification = (data.get("action").getAsString().equalsIgnoreCase("activate"));

                        String actionId = null; // If an input (button/text box) was activated (clicked), this would be the name of said input
                        String actionText = null; // If there was any text entered into the notification (pass this to the notification)
                        JsonObject actionParameters = new JsonObject();
                        if (data.has("actionParameters")) {
                            actionParameters = data.get("actionParameters").getAsJsonObject();
                        }

                        if (activateNotification) {
                            // Click the notification / button (if actionId present and valid)
                            MainActivity.notificationManager.activateNotification(notificationId, actionParameters);

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
                if (remandingTime != -1 && remandingTime != 5000000) // doesn't work worth s
                    batteryData.addProperty("batteryTimeRemaining", remandingTime / 1000);
            }

            connectionManager.sendRequestAsync("/api/v1/client/battery/info", batteryData);
        } catch (Exception e) {
            e.printStackTrace();
            Log.e(TAG, "sendBatteryInfo: failure");
        }
    }

    /**
     * Sends a notification's data out to the server. Action specifies whether the notification is new, being updated, or being deleted.
     * @param notification Notification to send
     * @param action Create, delete, update (update and create are treated somewhat the same)
     */
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

            if (!this.syncNotifications)
                return;

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
     /**
     * Sends a notification's data out to the server. Use this to send out new (not updated/deleted) notifications
     * @param notification Notification to send
     */
    public void sendNotification(NeptuneNotification notification) {
        this.sendNotification(notification, SendNotificationAction.CREATE);
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

        data.addProperty("friendlyName", MainActivity.ClientConfig.friendlyName);

        String apiUrl = "/api/v1/server/configuration/set";
        if (isResponse)
            apiUrl = "/api/v1/client/configuration/data";
        this.connectionManager.sendRequestAsync(apiUrl, data);
    }
    /**
     * Sends shared configuration information to the server, such as our friendly name.
     */
    public void syncConfiguration() {
        syncConfiguration(false);
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
    /**
     * Sends our clipboard to the server.
     */
    public void sendClipboard() {
        sendClipboard(false);
    }

    /**
     * Asks the server to send their clipboard data
     */
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
     * @param uri Content URI
     * @throws FileNotFoundException
     */
    public void sendFile(Uri uri) throws FileNotFoundException, SecurityException {
        if (!filesharingSettings.enabled) {
            return;
        }

        if (!connectionManager.isWebSocketConnected()) {
            connectionManager.createWebSocketClient(false);
        }

        Cursor returnCursor = MainActivity.Context.getContentResolver().query(uri, null, null, null, null);
        /*
         * Get the column indexes of the data in the Cursor,
         * move to the first row in the Cursor, get the data,
         * and display it.
         */
        int nameIndex = returnCursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
        int sizeIndex = returnCursor.getColumnIndex(OpenableColumns.SIZE);
        returnCursor.moveToFirst();

        String requestId = UUID.randomUUID().toString();
        if (fileRequestIdsToFilePaths == null)
            fileRequestIdsToFilePaths = new HashMap<>(1);

        fileRequestIdsToFilePaths.put(requestId, uri);
        JsonObject uploadRequest = new JsonObject();
        uploadRequest.addProperty("requestId", requestId);
        uploadRequest.addProperty("filename", returnCursor.getString(nameIndex));
        this.connectionManager.sendRequestAsync("/api/v1/server/filesharing/upload/newFileUUID", uploadRequest);
    }

    /**
     * Internal helper method to download a file given the file information.
     * @param fileUUID Unique identifier for the download
     * @param authenticationCode Code sent to authenticate ourselves to the server
     * @param fileName Name of the file being downloaded, we save the file to this name.
     */
    private void downloadFile(String fileUUID, String authenticationCode, String fileName) {
        try {
            Log.d(TAG, "Downloading file \"" + fileName + "\". UUID: " + fileUUID + ". Authentication code: " + authenticationCode);
            URL url = new URL("http://" + connectionManager.getIPAddress().toString() + "/api/v1/server/socket/" + connectionManager.getSocketUUID() + "/filesharing/" + fileUUID + "/download");
            HttpURLConnection connection = (HttpURLConnection) url.openConnection();
            connection.setRequestMethod("POST");
            connection.setRequestProperty("Content-Type", "application/json");
            connection.setDoOutput(true);

            String postData = "{ \"authenticationCode\": \"" + authenticationCode + "\" }";
            OutputStream os = connection.getOutputStream();
            os.write(postData.getBytes());
            os.flush();

            int responseCode = connection.getResponseCode();
            if (responseCode == HttpURLConnection.HTTP_OK) {
                String disposition = connection.getHeaderField("Content-Disposition");
                String contentType = connection.getContentType();
                int contentLength = connection.getContentLength();

                if (disposition != null) {
                    int index = disposition.indexOf("filename=");
                    if (index > 0) {
                        fileName = disposition.substring(index + 10, disposition.length() - 1);
                    }
                }

                // Save the file to the user's download folder
                File downloadDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
                File targetFile = new File(downloadDir, fileName);

                try (InputStream is = connection.getInputStream()) {
                    try (FileOutputStream fos = new FileOutputStream(targetFile)) {
                        int bytesRead = -1;
                        byte[] buffer = new byte[4096];
                        while ((bytesRead = is.read(buffer)) != -1) {
                            fos.write(buffer, 0, bytesRead);
                        }
                    }
                }
                Log.i(TAG,"File downloaded successfully.");
            } else {
                Log.e(TAG,"Server returned HTTP response code: " + responseCode);
            }

            connection.disconnect();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }


    // Uploads the file from the client to the server
    private void uploadFile(String fileUUID, String authenticationCode, Uri contentUri) {
        try {
            Log.d(TAG, "Uploading file, UUID: " + fileUUID);

            String crlf = "\r\n";
            String twoHyphens = "--";
            String boundary =  "*****";

            URL url = new URL("http://" + connectionManager.getIPAddress().toString() + "/api/v1/server/socket/" + connectionManager.getSocketUUID() + "/filesharing/" + fileUUID + "/upload");
            HttpURLConnection connection = (HttpURLConnection) url.openConnection();
            connection.setRequestMethod("POST");
            connection.setRequestProperty("Content-Type", "multipart/form-data;boundary=" + boundary);
            connection.setDoOutput(true);

            DataOutputStream request = new DataOutputStream(connection.getOutputStream());
            request.writeBytes(twoHyphens + boundary + crlf);
            request.writeBytes("Content-Disposition: form-data; name=\"file\";filename=\"filename2.jpg\"" + crlf);
            request.writeBytes(crlf);

            try (InputStream inputStream = MainActivity.Context.getContentResolver().openInputStream(contentUri)) {
                byte[] buffer = new byte[4096];
                int bytesRead = -1;
                while ((bytesRead = inputStream.read(buffer)) != -1) {
                    request.write(buffer, 0, bytesRead);
                }
            }

            request.writeBytes(crlf);
            request.writeBytes(twoHyphens + boundary + twoHyphens + crlf);
            request.flush();
            request.close();

            int responseCode = connection.getResponseCode();
            if (responseCode == HttpURLConnection.HTTP_OK) {
                Log.i(TAG,"File uploaded successfully.");
            } else {
                Log.e(TAG,"Server returned HTTP response code: " + responseCode);
            }

            connection.disconnect();
        } catch (MalformedURLException e) {
            e.printStackTrace();
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    public double ping() {
        return this.connectionManager.ping();
    }


    public void unpair() {
        try {
            if (pairKey != null) {
                if (!pairKey.isEmpty()) {
                    JsonObject data = new JsonObject();
                    data.addProperty("pairId", this.pairId.toString());
                    data.addProperty("clientId", MainActivity.ClientConfig.clientId.toString());
                    this.connectionManager.sendRequestAsync("/api/v1/server/unpair", data);
                }
            }
        } catch (Exception ignored) {}
        try { this.connectionManager.destroy(true); } catch (Exception ignored) {}
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
