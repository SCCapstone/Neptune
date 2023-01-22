package com.neptune.app.Backend;

import android.content.Context;
import android.util.Log;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonObject;
import com.google.gson.JsonParseException;
import com.google.gson.JsonParser;
import com.neptune.app.MainActivity;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.FileWriter;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;

public class ConfigItem {
    private ConfigurationManager ConfigManagerParent;

    // This is the version of the configuration NOT the app.
    public Version version = new Version("1");

    private boolean isAlive = false;
    private String fileName;
    private File fileObject;

    private String TAG = "ConfigItem-";

    // This can be used to add adapters
    protected GsonBuilder gsonBuilder = new GsonBuilder();

    public ConfigItem(String fileName, ConfigurationManager parent) throws JsonParseException {
        if (!fileName.endsWith(".json"))
            fileName += ".json";

        this.fileName = fileName;
        this.ConfigManagerParent = parent;

        this.TAG += fileName;

        try {
            fileObject = new File(MainActivity.Context.getFilesDir(), fileName);
            isAlive = true;
        } catch (JsonParseException e) {
            e.printStackTrace();
            throw e;
        }
    }

    public void close(boolean save) {
        if (!isAlive)
            return;

        Log.i(TAG, "closeConfig: closing configuration file");

        try {
            if (save)
                save();

            isAlive = false;

            ConfigManagerParent.removeConfigItemFromCache(this);
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    protected void makeWritable() throws IOException {
        try {
            if (!fileObject.exists()) {
                try (FileOutputStream fos = MainActivity.Context.openFileOutput(fileName, Context.MODE_PRIVATE)) {
                    fos.write(toJson().toString().getBytes(StandardCharsets.UTF_8));
                }
            } else if (fileObject.isDirectory()) {
                throw new FileNotFoundException();
            }

            if (!fileObject.canWrite()) {
                fileObject.setWritable(true);
            }
        } catch (FileNotFoundException e) {
            e.printStackTrace();
            throw e;
        } catch (IOException e) {
            e.printStackTrace();
            throw e;
        }
    }

    public String read() throws IOException {
        Log.d(TAG, "loadConfig(): reading configuration data from file");

        if (!fileObject.isFile() || !fileObject.exists()) {
            Log.d(TAG,"loadConfig(): can't load what doesn't exist! Skipping load, making writable.");
            // Doesn't exist.
            makeWritable();
            return "{}";
        }

        makeWritable();
        FileInputStream fileInputStream = new FileInputStream(fileObject);
        InputStreamReader inputStreamReader = new InputStreamReader(fileInputStream, StandardCharsets.UTF_8);
        StringBuilder contentsBuilder = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(inputStreamReader)) {
            String line = reader.readLine();
            while (line != null) {
                contentsBuilder.append(line).append("\n");
                line = reader.readLine();
            }
        } catch (IOException e) {
            e.printStackTrace();
            throw e;

        } finally {
            String contents = contentsBuilder.toString();
            return contents;

        }
    }

    public void load() throws IOException, JsonParseException {
        try {
            String contents = read();
            fromJson(contents);
        } catch (JsonParseException e) {
            e.printStackTrace();
            throw e;
        }
    }

    public void save() throws IOException {
        Log.d(TAG, "saveConfig(): writing configuration data to file");

        try {
            String newContents = toJson().toString();
            if (!fileObject.exists()) {
                fileObject.createNewFile();

            } else if (fileObject.isDirectory()) {
                throw new FileNotFoundException();
            }

            if (!fileObject.canWrite()) {
                fileObject.setWritable(true);
            }

            try (FileOutputStream fos = MainActivity.Context.openFileOutput(fileName, Context.MODE_PRIVATE)) {
                fos.write(newContents.getBytes(StandardCharsets.UTF_8));
            }
        } catch (IOException e) {
            e.printStackTrace();
            throw e;
        }
    }

    public String getFileName() {
        return fileName;
    }

    public String getFilePath() {
        return fileObject.getPath();
    }

    // Override these!

    /**
     * Convert the configuration to Json
     * @return This class serialized to Json
     */
    public JsonObject toJson() {
        Gson gson = gsonBuilder.create();
        JsonObject jsonObject = new JsonObject();
        jsonObject.addProperty("version", this.version.toString());
        return jsonObject;
    }

    /**
     * Set class properties to those in a Json string. Load class properties from Json.
     *
     * Override this
     * @param jsonObject JsonObject to load from (the Json)
     */
    public void fromJson(JsonObject jsonObject) {
        if (jsonObject.has("version"))
            this.version = new Version(jsonObject.get("version").getAsString());
    }
    /**
     * Set class properties to those in a Json string. Load class properties from Json.
     *
     * You do not have to override this
     * @param json Json text to load from
     */
    public void fromJson(String json) throws JsonParseException {
        if (json.isEmpty())
            return;

        JsonObject jsonObject = JsonParser.parseString(json).getAsJsonObject();
        fromJson(jsonObject);
    }

    /**
     * If the file is still open and "alive" (or active)
     * @return file not closed
     */
    public boolean getIsAlive() {
        return isAlive;
    }

    public void delete() {
        if (fileObject.exists())
            fileObject.delete();
    }

    public void rename(String fileName) {
        if (!fileName.endsWith(".json"))
            fileName += ".json";

        this.fileName = fileName;

        this.TAG = "ConfigItem-" + fileName;

        File newName = new File(MainActivity.Context.getFilesDir(), fileName);
        fileObject.renameTo(newName);
    }
}
