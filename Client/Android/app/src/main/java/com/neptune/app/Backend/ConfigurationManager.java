package com.neptune.app.Backend;

import java.util.Map;

public class ConfigurationManager {
    protected Map<String, ConfigItem> cachedItems;

    public ConfigurationManager() {}

    public ConfigItem loadConfig(String filePath)  {
        ConfigItem cached = cachedItems.get(filePath);
        if (cached != null)
            if (cached.getIsAlive() == true)
                return cached;

        ConfigItem newItem = new ConfigItem(filePath);
        cachedItems.put(filePath, newItem);
        return newItem;
    }
}
