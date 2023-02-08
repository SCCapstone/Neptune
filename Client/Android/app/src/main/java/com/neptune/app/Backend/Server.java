package com.neptune.app.Backend;


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

    // This will create the connection manager and initiate connection
    public void setupConnectionManager() throws ConnectionManager.FailedToPair {
        connectionManager = new ConnectionManager(this.ipAddress, this);
        Log.d("SERVER", "setupConnectionManager: we did something");
        connectionManager.initiateConnectionSync();
    }

    public void sendNotification(NeptuneNotification notification) {
        try {
            if (connectionManager == null)
                return;

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

    public boolean sendPing() {

        return false;
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


}
