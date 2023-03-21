package com.neptune.app.Backend.Structs;

import com.google.gson.JsonObject;

public class APIDataPackage {
    // Endpoint
    public String command;
    // Json data
    public JsonObject data;

    public APIDataPackage(String command, JsonObject data) {
        this.command = command;
        this.data = data;
    }
}
