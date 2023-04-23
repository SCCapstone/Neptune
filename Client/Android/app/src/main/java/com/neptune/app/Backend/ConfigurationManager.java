package com.neptune.app.Backend;

import android.content.Context;
import android.util.Log;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

public class ConfigurationManager {
    private static String TAG = "Neptune-ConfigurationManager";

    public Context context;

    protected Map<String, ConfigItem> cachedItems;
    private boolean isDestroying = false;

    public ConfigurationManager(Context context) {
        cachedItems = new HashMap<String, ConfigItem>();

        this.context = context;
    }

    public ConfigItem loadConfig(String filePath) throws IOException {
        ConfigItem cached = cachedItems.get(filePath);
        Log.i(TAG, "Loading/Creating: " + filePath);

        if (cached != null)
            if (cached.getIsAlive())
                return cached;

        ConfigItem newItem = new ConfigItem(filePath, this);
        cachedItems.put(filePath, newItem);
        return newItem;
    }

    /**
     * Removes a config item from the cache. This is called by the config item when closed.
     * @param item
     * @return
     */
    public void removeConfigItemFromCache(ConfigItem item) {
        if (isDestroying || !this.cachedItems.containsKey(item.getFileName()))
            return;

        Log.i(TAG, "Removing: " + item.getFileName());

        String filePath = item.getFileName();
        for (Map.Entry<String,ConfigItem> config : this.cachedItems.entrySet()) {
            if (filePath.equalsIgnoreCase(config.getValue().getFileName())) {
                this.cachedItems.remove(config.getKey());
                return;
            }
        }

        return;
    }

    /**
     * Destroys the configuration manager and closes all open (cached) configs
     * @param saveConfigs Save the config when closed
     */
    public void destroy(boolean saveConfigs) {
        Log.i(TAG, "Destroying");
        isDestroying = true;
        for (Map.Entry<String,ConfigItem> config : this.cachedItems.entrySet()) {
            config.getValue().close(saveConfigs);
            this.cachedItems.remove(config.getKey());
        }
    }
}
