package com.neptune.app;

import static org.junit.Assert.assertArrayEquals;
import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotEquals;

import com.google.gson.JsonParseException;
import com.google.gson.JsonSyntaxException;
import com.neptune.app.Backend.ConfigItem;
import com.neptune.app.Backend.ConfigurationManager;
import com.neptune.app.Backend.Version;

import org.json.JSONException;
import org.junit.Test;

import java.io.File;
import java.io.IOException;

public class ConfigItemTest {
    private final String TEST_CONFIG_FILE = "testConfig.json";

    private static ConfigurationManager configurationManager = new ConfigurationManager();
    private ConfigItem testConfigItem;


    private void createTestConfigItem() throws IOException {
        testConfigItem = new ConfigItem(TEST_CONFIG_FILE, configurationManager);
    }

    private void deleteTestConfigItem(boolean delete) {
        File testConfigItemFileObject = new File(TEST_CONFIG_FILE);

        if (testConfigItem != null)
            testConfigItem.close(false);

        if (delete && testConfigItemFileObject.exists()) {
            testConfigItemFileObject.delete();
        }
    }
    private void deleteTestConfigItem() {
        deleteTestConfigItem(true);
    }


    @Test
    public void canCreate() throws IOException {
        createTestConfigItem();
        assertEquals(true, testConfigItem.getIsAlive());
        deleteTestConfigItem();
    }

    @Test
    public void toJson() throws IOException {
        createTestConfigItem();
        try {
            Version version = new Version(2, 4, 1, "debug", "thisIsForTesting");
            testConfigItem.version = version;

            String expectedJson = "{\"version\":\"" + version.toString() + "\"}";

            assertEquals(expectedJson, testConfigItem.toJson().toString());
        } finally {
            deleteTestConfigItem();
        }
    }

    @Test
    public void fromJson() throws IOException {
        createTestConfigItem();
        try {
            Version version = new Version(2, 4, 1, "debug", "thisIsForTesting");
            String myJson = "{ \"version\": \"" + version.toString() + "\" }";

            testConfigItem.fromJson(myJson);
            assertEquals(testConfigItem.version.toString(), version.toString());
        } catch (JsonParseException e) {
            e.printStackTrace();

        } finally {
            deleteTestConfigItem();
        }
    }

    @Test
    public void saveAndLoad() throws IOException {
        createTestConfigItem();

        Version testVersion = new Version(5,3,1,"debug","saveAndLoadTest");;

        testConfigItem.version = testVersion;

        testConfigItem.save();
        deleteTestConfigItem(false);
        createTestConfigItem();

        assertEquals(testVersion.toString(), testConfigItem.version.toString());
    }
}
