package com.neptune.app.Backend;

import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParseException;
import com.google.gson.JsonParser;
import com.neptune.app.Backend.Adapters.ClientConfigEncryptionAdapter;
import com.neptune.app.Backend.Structs.ClientConfigEncryption;

import org.json.JSONException;

import java.io.IOException;
import java.text.DateFormat;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.time.temporal.TemporalAccessor;
import java.util.Date;
import java.util.UUID;

/**
 * Server configuration
 */
public class ServerConfig extends ConfigItem {
    // IP Address of the server (last known address)
    public IPAddress ipAddress;

    // Server GUID
    public UUID serverId;

    // Pair info
    public UUID pairId;
    // Unique pair key, prenegotiated shared key
    public byte[] pairKey;


    // User defined name
    public String friendlyName;

    // When the server was paired
    public Date dateAdded;

    // Which app's notifications we do not send to this server. Array of app package names
    public String[] notificationBlacklistApps;



    public ServerConfig(String serverId, ConfigurationManager parent) throws IOException, JsonParseException {
        super("server_" + serverId + ".json", parent);

        this.serverId = UUID.fromString(serverId);
        load();
    }


    /**
     * Load the server configuration from a JsonObject
     * @param jsonObject JsonObject to load from (the Json)
     */
    @Override
    public void fromJson(JsonObject jsonObject) {
        super.fromJson(jsonObject);

        this.serverId = UUID.fromString(jsonObject.get("serverId").getAsString());

        this.ipAddress = new IPAddress(jsonObject.get("ipAddress").getAsString());
        this.friendlyName = jsonObject.get("friendlyName").getAsString();

        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            TemporalAccessor ta = DateTimeFormatter.ISO_INSTANT.parse(jsonObject.get("dateAdded").getAsString());
            Instant i = null;
            i = Instant.from(ta);
            Date date = Date.from(i);
            this.dateAdded = date;
        } else {
            try {
                DateFormat df1 = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSSZ");
                this.dateAdded = df1.parse(jsonObject.get("dateAdded").getAsString());
            } catch (ParseException e) {
                e.printStackTrace();
            }
        }

        this.pairId = UUID.fromString(jsonObject.get("pairId").getAsString());
        this.pairKey = NeptuneCrypto.convertBase64ToBytes(jsonObject.get("pairKey").getAsString());

        JsonArray notificationBlacklistApps = jsonObject.getAsJsonArray("notificationBlacklistApps");
        this.notificationBlacklistApps = new String[notificationBlacklistApps.size()];
        for (int i=0; i<notificationBlacklistApps.size(); i++) {
            this.notificationBlacklistApps[i] = notificationBlacklistApps.get(i).getAsString();
        }
    }

    /**
     * Serialize the server config to Json
     * @return JsonObject representing the server config properties
     */
    @Override
    public JsonObject toJson() {
        JsonObject jsonObject = super.toJson(); // Get the version info

        if (serverId == null)
            return jsonObject;
        jsonObject.addProperty("serverId", this.serverId.toString());

        if (friendlyName != null)
            jsonObject.addProperty("friendlyName", this.friendlyName);
        if (ipAddress != null)
            jsonObject.addProperty("ipAddress", this.ipAddress.toString());

        if (pairId != null && pairKey.length > 0) {
            jsonObject.addProperty("pairId", this.pairId.toString());
            jsonObject.addProperty("pairKey", NeptuneCrypto.convertBytesToBase64(this.pairKey));
        }

        if (notificationBlacklistApps != null) {
            JsonArray notificationBlacklistApps = new JsonArray();
            for (int i = 0; i< this.notificationBlacklistApps.length; i++) {
                notificationBlacklistApps.add(this.notificationBlacklistApps[i]);
            }
            jsonObject.add("notificationBlacklistApps", notificationBlacklistApps);
        }

        return jsonObject;
    }
}