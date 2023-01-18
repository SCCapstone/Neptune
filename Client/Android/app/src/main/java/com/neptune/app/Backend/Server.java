package com.neptune.app.Backend;


import android.util.Log;

import com.google.gson.JsonObject;
import com.google.gson.JsonParseException;

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
    }
    public Server(UUID serverId, ConfigurationManager configurationManager) throws JsonParseException, IOException {
        super(serverId.toString(), configurationManager);
    }

    public Server(JsonObject jsonObject, ConfigurationManager configurationManager) throws JsonParseException, IOException {
        super(jsonObject.get("serverId").getAsString(), configurationManager);
        fromJson(jsonObject);
    }

    // This will create the connection manager and initiate connection
    public void setupConnectionManager() {
        connectionManager = new ConnectionManager(this.ipAddress, this);
        Log.d("SERVER", "setupConnectionManager: we did something");
        connectionManager.initiateConnection();
    }

    public void sendNotification(NeptuneNotification notification) {
        try {
            if (connectionManager.getHasNegotiated()) {
                connectionManager.sendRequestAsync("/api/v1/server/sendNotification", new JSONObject(notification.toString()));
            }
        } catch (JSONException e) {
            e.printStackTrace();
        } catch (MalformedURLException e) {
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


    public boolean unpair() {

        return false;
    }

    public boolean pair() {
        if (connectionManager == null)
            setupConnectionManager();

        if (!connectionManager.getHasNegotiated());
            connectionManager.initiateConnection();

        connectionManager.pair();
        return false;
    }
}
