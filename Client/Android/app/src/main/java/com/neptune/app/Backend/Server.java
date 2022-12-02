package com.neptune.app.Backend;


import android.app.Notification;
import android.util.Log;

import org.json.JSONObject;

import java.util.Date;

import kotlin.NotImplementedError;

public class Server {
    private IPAddress ipAddress;
    private ConnectionManager connectionManager;
    private ConfigItem configuartion;
    private String serverId;
    private String name;
    private String friendlyName;
    private Date dateAdded;
    private String[] notifiableApps;

    public Server(IPAddress ipAddress, ConnectionManager connectionManager, ConfigItem configuartion, String serverId, String name,  String friendlyName, Date dateAdded, String[] notifiableApps) {
        this.ipAddress = ipAddress;
        this.connectionManager = connectionManager;
        this.configuartion = configuartion;
        this.serverId = serverId;
        this.name = name;
        this.friendlyName = friendlyName;
        this.dateAdded = dateAdded;
        this.notifiableApps = notifiableApps;
    }

    public Server(String friendlyName) {
        this.configuartion = new ConfigItem(friendlyName);
    }

    public Server(JSONObject jsonObject) {
    }

    public void setupConnectionManager() {
        connectionManager = new ConnectionManager(this.ipAddress, this.configuartion);
        Log.d("SERVER", "setupConnectionManager: we did something");
        connectionManager.initiateConnection();
    }

    public boolean sendNotification(Notification notification) {

        return false;
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

    public JSONObject toJSON() {

        return null;
    }

    public boolean saveConfiguration() {

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
