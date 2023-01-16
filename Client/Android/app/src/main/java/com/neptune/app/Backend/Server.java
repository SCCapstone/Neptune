package com.neptune.app.Backend;


import android.util.Log;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.net.MalformedURLException;
import java.text.DateFormat;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.time.temporal.TemporalAccessor;
import java.util.Date;
import java.util.TimeZone;

import kotlin.NotImplementedError;

public class Server {
    private IPAddress ipAddress;
    private ConnectionManager connectionManager;
    private ConfigItem configuartion;
    private String serverId;
    private String name;
    private String friendlyName;
    private Date dateAdded;
    private String[] notificationBlacklistApps;

    public Server(IPAddress ipAddress, ConnectionManager connectionManager, ConfigItem configuartion, String serverId, String name,  String friendlyName, Date dateAdded, String[] notificationBlacklistApps) {
        this.ipAddress = ipAddress;
        this.connectionManager = connectionManager;
        this.configuartion = configuartion;
        this.serverId = serverId;
        this.name = name;
        this.friendlyName = friendlyName;
        this.dateAdded = dateAdded;
        this.notificationBlacklistApps = notificationBlacklistApps;
    }

    public Server(String friendlyName) {
        this.configuartion = new ConfigItem(friendlyName);
    }

    public Server(JSONObject jsonObject) throws JSONException, ParseException {
        this.ipAddress = new IPAddress(jsonObject.getString("ipAddress"));
        this.serverId = jsonObject.getString("serverId");
        this.name = jsonObject.getString("name");
        this.friendlyName = jsonObject.getString("friendlyName");

        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            TemporalAccessor ta = DateTimeFormatter.ISO_INSTANT.parse(jsonObject.getString("dateAdded"));
            Instant i = null;
            i = Instant.from(ta);
            Date date = Date.from(i);
            this.dateAdded = date;
        } else {
            DateFormat df1 = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSSZ");
            this.dateAdded = df1.parse(jsonObject.getString("dateAdded"));
        }

        JSONArray notifiableAppsArray = jsonObject.getJSONArray("notificationBlacklistApps");
        this.notificationBlacklistApps = new String[notifiableAppsArray.length()];
        for (int i=0; i<notifiableAppsArray.length(); i++) {
            this.notificationBlacklistApps[i] = notifiableAppsArray.getString(i);
        }

        this.configuartion = new ConfigItem(this.serverId);
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

    public IPAddress setIPAddress(IPAddress ip) {
        if (ip != null) {
            this.ipAddress = ip;
            //this.configuartion.configEntries.IPAddress = this.ipAddress;
            this.configuartion.saveConfig();
        } else {
            throw new NotImplementedError("IPAddress expected string or IPAddress, got");
        }
        return ipAddress;
    }

    public IPAddress getIpAddress() {
        return ipAddress;
    }

    public boolean unpair() {

        return false;
    }

    public boolean pair() {

        return false;
    }

    public JSONObject toJSON() throws JSONException {
        JSONObject jsonObject = new JSONObject();
        jsonObject.put("ipAddress", this.ipAddress.toString());
        jsonObject.put("serverId", this.serverId);
        jsonObject.put("name", this.name);
        jsonObject.put("friendlyName", this.friendlyName);

        TimeZone tz = TimeZone.getTimeZone("UTC");
        DateFormat df = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm'Z'"); // Quoted "Z" to indicate UTC, no timezone offset
        df.setTimeZone(tz);
        String dateAddedISO = df.format(this.dateAdded);
        jsonObject.put("dateAdded", dateAddedISO);

        JSONArray notificationBlacklistApps = new JSONArray();
        for (int i = 0; i< this.notificationBlacklistApps.length; i++) {
            notificationBlacklistApps.put(this.notificationBlacklistApps[i]);
        }
        jsonObject.put("notificationBlacklistApps", notificationBlacklistApps);

        return jsonObject;
    }

    public boolean saveConfiguration() {
        this.configuartion.configEntries.put("ipAddress", this.ipAddress.toString());
        this.configuartion.configEntries.put("serverId", this.serverId);
        this.configuartion.configEntries.put("name", this.name);
        this.configuartion.configEntries.put("friendlyName", this.friendlyName);

        TimeZone tz = TimeZone.getTimeZone("UTC");
        DateFormat df = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm'Z'"); // Quoted "Z" to indicate UTC, no timezone offset
        df.setTimeZone(tz);
        String dateAddedISO = df.format(this.dateAdded);
        this.configuartion.configEntries.put("dateAdded", dateAddedISO);

        this.configuartion.configEntries.put("notificationBlacklistApps", this.notificationBlacklistApps);

        this.configuartion.saveConfig();
        return false;
    }

    public String getFriendlyName() {
        return this.friendlyName;
    }

    public String setFriendlyName(String friendlyName) {
        this.friendlyName = friendlyName;
        //this.configuartion.configEntries.friendlyName = friendlyName;
        //this.configuartion.saveConfig();

        return friendlyName;
    }

    public Date getDateAdded () {
        return this.dateAdded;
    }

    public Date setDateAdded(Date dateAdded) {
        if (dateAdded != null) {
            this.dateAdded = dateAdded;
        }
        else {
            Date dateTime = new Date();
            if (dateTime != null) {
                this.dateAdded = dateTime;
            }
            else {
                throw new NotImplementedError("Invalid time value");
            }
        }
        //this.configuartion.configEntries.dateAdded = this.dateAdded;
        this.configuartion.saveConfig();
        return dateAdded;
    }

}
