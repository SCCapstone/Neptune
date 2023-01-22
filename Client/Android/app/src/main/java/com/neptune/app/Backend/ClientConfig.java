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
import org.json.JSONObject;

import java.io.IOException;
import java.util.Map;
import java.util.UUID;

/**
 * Persistent client configuration
 */
public class ClientConfig extends ConfigItem {

    // This is the version of the configuration NOT the app.
    public Version version = new Version("1");

    // First run?
    public boolean firstRun = true;

    // Unique client id
    public UUID clientId = UUID.randomUUID();

    // Friendly name of client
    public String friendlyName = "My Phone";

    // Config file encryption settings
    public ClientConfigEncryption encryption = new ClientConfigEncryption();

    // Array of server ids we're paired with (saved to system)
    public String[] savedServerIds = new String[0];



    // Class specific (not config settings)
    private boolean allowLoad = false;

    public ClientConfig(String filePath, ConfigurationManager parent) throws IOException, JSONException {
        super(filePath, parent);

        gsonBuilder.registerTypeAdapter(ClientConfigEncryption.class, new ClientConfigEncryptionAdapter());
        allowLoad = true;
        load();
    }

    @Override
    public void fromJson(JsonObject jsonObject) {
        if (!allowLoad)
            return;

        //super.fromJson(jsonObject);

        Gson gson = gsonBuilder.create();
        this.version = new Version(jsonObject.get("version").getAsString());
        this.clientId = UUID.fromString(jsonObject.get("clientId").getAsString());
        this.firstRun = jsonObject.get("firstRun").getAsBoolean();
        this.friendlyName = jsonObject.get("friendlyName").getAsString();
        this.encryption = gson.fromJson(jsonObject.getAsJsonObject("encryption"), ClientConfigEncryption.class);

        if (jsonObject.has("savedServerIds")) {
            JsonArray savedServerIds = jsonObject.getAsJsonArray("savedServerIds");
            this.savedServerIds = new String[savedServerIds.size()];
            for (int i = 0; i < savedServerIds.size(); i++) {
                this.savedServerIds[i] = savedServerIds.get(i).getAsString();
            }
        } else {
            this.savedServerIds = new String[0];
        }
    }

    @Override
    public JsonObject toJson() {
        Gson gson = gsonBuilder.create();
        JsonObject jsonObject = super.toJson();

        if (clientId == null)
            return jsonObject;
        jsonObject.addProperty("clientId", this.clientId.toString());
        jsonObject.addProperty("firstRun", this.firstRun);
        jsonObject.addProperty("friendlyName", this.friendlyName);

        if (encryption == null) encryption = new ClientConfigEncryption();
        JsonElement encryptionElement = JsonParser.parseString(gson.toJson(this.encryption, ClientConfigEncryption.class)).getAsJsonObject();
        jsonObject.add("encryption", encryptionElement);

        if (this.savedServerIds != null) {
            JsonArray savedServerIds = new JsonArray();
            for (int i = 0; i< this.savedServerIds.length; i++) {
                savedServerIds.add(this.savedServerIds[i]);
            }
            jsonObject.add("savedServerIds", savedServerIds);
        }

        return jsonObject;
    }
}
