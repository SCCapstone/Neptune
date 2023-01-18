package com.neptune.app.Backend.Structs;

import com.google.gson.TypeAdapter;
import com.google.gson.stream.JsonReader;
import com.google.gson.stream.JsonWriter;

import org.json.JSONObject;

import java.io.IOException;

/**
 * Struct for the 'encryption' value for the ClientConfig
 */
public class ClientConfigEncryption {
    public boolean enabled = false;
    public boolean active = false;
    public int newKeyLength = 64;

    public ClientConfigEncryption() {}

    public String toString() {
        return "ClientConfigEncryption[enabled="+enabled+", active="+active+", newKeyLength"+newKeyLength+"]";
    }
}

