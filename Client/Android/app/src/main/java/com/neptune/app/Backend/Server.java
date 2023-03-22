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


import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.TimeZone;
import java.util.UUID;

public class Server extends ServerConfig {
    private final String TAG;

    private ConnectionManager connectionManager;


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

                String command = apiDataPackage.command.toLowerCase();
                if (command.equals("/api/v1/echo")) {
                    this.connectionManager.sendRequestAsync("/api/v1/echoed", apiDataPackage.getOriginalPacket().get("data"));
                } else if (command.equals("/api/v1/client/ping") && apiDataPackage.isJsonObject()) {
                    Date now = new Date();
                    SimpleDateFormat formatter = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");
                    formatter.setTimeZone(TimeZone.getTimeZone("UTC"));
                    String timestamp = formatter.format(now);

                    JsonObject pong = new JsonObject();
                    pong.addProperty("receivedAt", apiDataPackage.jsonObject().get("timestamp").toString());
                    pong.addProperty("timestamp", timestamp);
                    this.connectionManager.sendRequestAsync("/api/v1/server/pong", pong);
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
                if (!notificationBlacklistApps.contains(notification.appPackageName)) {
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

                    connectionManager.sendRequestAsync("/api/v1/server/sendNotification", notificationData);
                }
            }

        } catch (JsonParseException e) {
            e.printStackTrace();
        }
    }

    /**
     * Sends shared configuration information to the server.
     * (Pushes some config items to the server)
     */
    public void syncConfiguration() {
        JsonObject data = new JsonObject();

        JsonObject notificationSettings = new JsonObject();
        notificationSettings.addProperty("enabled", this.syncNotifications);

        JsonObject clipboardSettings = new JsonObject();
        clipboardSettings.addProperty("enabled", this.clipboardSettings.enabled);
        clipboardSettings.addProperty("allowServerToSet", this.clipboardSettings.allowServerToSet);
        clipboardSettings.addProperty("allowServerToGet", this.clipboardSettings.allowServerToGet);
        clipboardSettings.addProperty("synchronizeClipboardToServer", this.clipboardSettings.synchronizeClipboardToServer);

        JsonObject fileSharingSettings = new JsonObject();
        fileSharingSettings.addProperty("enabled", this.fileSharingEnabled);
        fileSharingSettings.addProperty("autoReceiveFromServer", this.fileSharingAutoReceiveFromServer);
        fileSharingSettings.addProperty("clientBrowsable", this.fileSharingClientBrowsable);


        data.add("notificationSettings", notificationSettings);
        data.add("clipboardSettings", clipboardSettings);
        data.add("fileSharingSettings", fileSharingSettings);


        this.connectionManager.sendRequestAsync("/api/v1/server/configuration/set", data);
    }

    public void sendNotification(NeptuneNotification notification) {
        this.sendNotification(notification, SendNotificationAction.CREATE);
    }


    public void sendClipboard(String dataToSend) {
        if (!this.clipboardSettings.enabled)
            return;

        JsonObject clipboardData = Clipboard.getClipboard();

        this.connectionManager.sendRequestAsync("/api/v1/server/clipboard/set", clipboardData);
    }

    public boolean sendFile(String filePath) {
        return false;
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
