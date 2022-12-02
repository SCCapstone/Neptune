package com.neptune.app.Backend;

import org.json.JSONObject;

import java.util.Map;

import kotlin.NotImplementedError;

public class ConfigItem {
    protected Map<String, Object> configEntries;
    private boolean isAlive;
    private String filePath;

    public ConfigItem(String filePath) {
        // Do things!
    }

    public void closeConfig(boolean save) {
        if (save)
            saveConfig();
        throw new NotImplementedError();
    }

    public void loadConfig() {
        throw new NotImplementedError();

    }

    public void saveConfig() {
        //throw new NotImplementedError();
    }

    public Object getProperty(String key) {
        return configEntries.get(key);
    }

    public void setProperty(String key, Object value) {
        configEntries.put(key, value);
    }

    public String getFilePath() {
        return filePath;
    }

    public JSONObject toJSON() {
        throw new NotImplementedError();
    }

    public void fromJSON(JSONObject json) {
        throw new NotImplementedError();
    }

    /**
     * If the file is still open and "alive" (or active)
     * @return file not closed
     */
    public boolean getIsAlive() {
        return isAlive;
    }
}
