package com.neptune.app.Backend;


import android.app.Notification;

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

    public Server server() {
        this.ipAddress = this.ipAddress;
        this.connectionManager = this.connectionManager;
        this.configuartion = this.configuartion;
        this.serverId = this.serverId;
        this.name = this.name;
        this.friendlyName = this.friendlyName;
        this.dateAdded = this.dateAdded;
        this.notifiableApps = this.notifiableApps;

        return null;
    }

    public Server server(JSONObject jsonObject) {

        return null;
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
        }
        else if (ip.equals("string")) {
            //.ipAddress = new IPAddress(ip);
            //this.configuartion.configEntries.IPAddress = this.ipAddress;
            this.configuartion.saveConfig();
        }
        else {
            throw new NotImplementedError("IPAddress expected string or IPAddress, got " + (ip));
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
        if (friendlyName != "string") {
            throw new NotImplementedError("friendlyName expected string got " + (friendlyName));
        }

        this.friendlyName = friendlyName;
        //this.configuartion.configEntries.friendlyName = friendlyName;
        this.configuartion.saveConfig();

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
