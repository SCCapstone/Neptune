package com.neptune.app.Backend;

import android.app.Notification;

import org.json.JSONObject;

import java.util.Date;

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

    public IPAddress setIPAddress() {
        this.ipAddress = ipAddress;

        return null;
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

}
