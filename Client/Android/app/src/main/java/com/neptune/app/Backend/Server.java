package com.neptune.app.Backend;


import static android.content.Context.BATTERY_SERVICE;

import android.content.Intent;
import android.content.IntentFilter;
import android.os.BatteryManager;
import android.os.Build;
import android.util.Log;

import com.google.gson.JsonObject;
import com.google.gson.JsonParseException;
import com.google.gson.JsonParser;
import com.neptune.app.MainActivity;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.IOException;
import java.net.MalformedURLException;
import java.text.DateFormat;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.time.temporal.TemporalAccessor;
import java.util.Date;
import java.util.TimeZone;
import java.util.UUID;

import kotlin.NotImplementedError;

public class Server extends ServerConfig {
    private ConnectionManager connectionManager;


    public Server(String serverId, ConfigurationManager configurationManager) throws JsonParseException, IOException {
        super(serverId, configurationManager);
        Log.i("Server", "Server(): " + serverId);
    }
    public Server(UUID serverId, ConfigurationManager configurationManager) throws JsonParseException, IOException {
        super(serverId.toString(), configurationManager);
        Log.i("Server", "Server(): " + serverId.toString());
    }

    public Server(JsonObject jsonObject, ConfigurationManager configurationManager) throws JsonParseException, IOException {
        super(jsonObject.get("serverId").getAsString(), configurationManager);
        fromJson(jsonObject);
        Log.i("Server", "Server(): " + this.serverId.toString());
    }

    //

    /**
     * This will create the connection manager and initiate connection.
     * If the connection manager already exists, it'll check if we're connected. If not, we reconnect. If connected we return.
     * @throws ConnectionManager.FailedToPair
     */
    public void setupConnectionManager() throws ConnectionManager.FailedToPair {
        if (connectionManager != null) {
            if (connectionManager.ping() < 0)
                connectionManager.initiateConnectionSync();
            return;
        }

        connectionManager = new ConnectionManager(this.ipAddress, this);
        Log.d("SERVER", "setupConnectionManager: we did something");
        connectionManager.initiateConnectionSync();
    }

    /**
     * Send the battery data to the server asynchronously.
     */
    public void sendBatteryInfo() {
        try {
            if (connectionManager == null) {
                try {
                    this.setupConnectionManager();
                } catch (ConnectionManager.FailedToPair e) {
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
            Log.e("Server-" + this.serverId, "sendBatteryInfo: failure");
        }
    }

    public void sendNotification(NeptuneNotification notification) {
        try {
            if (connectionManager == null) {
                try {
                    this.setupConnectionManager();
                } catch (ConnectionManager.FailedToPair e) {
                    e.printStackTrace();
                    return;
                }

                if (connectionManager == null)
                    return;
            }

            if (!this.syncNotifications)
                return;

            if (!this.syncNotifications) {
                return;
            }

            if (connectionManager.getHasNegotiated()) {
                //if (!notificationBlacklistApps.contains(notification.appPackageName)) {
                    connectionManager.sendRequestAsync("/api/v1/server/sendNotification", JsonParser.parseString(notification.toString()).getAsJsonObject());
                //}
            }

        } catch (JsonParseException e) {
            e.printStackTrace();
        }
    }

    public boolean sendClipboard(Object object ) {

        return false;
    }

    public boolean sendFile(String file) {

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

    public void pair() throws ConnectionManager.FailedToPair {
        if (connectionManager == null) {
            setupConnectionManager();
        }

        if (!connectionManager.getHasNegotiated())
            connectionManager.initiateConnection();

        connectionManager.pair();
    }

    enum SendNotificationAction {

    }

}
