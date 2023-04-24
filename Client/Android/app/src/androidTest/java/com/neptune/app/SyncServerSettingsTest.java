package com.neptune.app;

import static androidx.test.espresso.action.ViewActions.click;
import static androidx.test.espresso.action.ViewActions.scrollTo;
import static androidx.test.espresso.matcher.ViewMatchers.withId;

import androidx.test.espresso.Espresso;
import androidx.test.ext.junit.rules.ActivityScenarioRule;

import com.neptune.app.Backend.IPAddress;
import com.neptune.app.Backend.Server;

import org.junit.Assert;
import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.util.UUID;

public class SyncServerSettingsTest {
    @Rule
    public ActivityScenarioRule<MainActivity> mainRule = new ActivityScenarioRule<>(MainActivity.class);

    @Before
    public void disableAnimations() {
        // Disable animations
        mainRule.getScenario().onActivity(activity -> {
            activity.getSupportFragmentManager().beginTransaction().setCustomAnimations(0,0).commitAllowingStateLoss();
        });
    }

    @Test
    public void syncServerSettingsTest() {
        Server testServer = null;
        try {
            //Creates a mock server so the client interactions can be tested.
            UUID id = UUID.randomUUID();
            testServer = new Server(id.toString(), MainActivity.configurationManager);
            testServer.friendlyName = "testServer";
            testServer.ipAddress = new IPAddress("1.1.1.1:50000");
            testServer.filesharingSettings.receivedFilesDirectory = "Pictures";

            MainActivity.serverManager.addServer(testServer);

            mainRule.getScenario().recreate();
            testServer = MainActivity.serverManager.getServer(id);

            Espresso.onView(withId(R.id.server_name)).perform(click());

            Espresso.onView(withId(R.id.server_settings_sync)).perform(scrollTo()).perform(click());
            String logcatOutput = getLogcatOutput();
            Assert.assertTrue(logcatOutput.contains("Syncing with testServer"));
        } catch (IOException e) {
            e.printStackTrace();
        } finally {
            if (testServer != null)
                testServer.delete();
        }
    }

    private String getLogcatOutput() throws IOException {
        Process process = Runtime.getRuntime().exec("logcat -d");
        BufferedReader bufferedReader = new BufferedReader(new InputStreamReader(process.getInputStream()));
        StringBuilder logcatOutput = new StringBuilder();
        String line;
        while ((line = bufferedReader.readLine()) != null) {
            logcatOutput.append(line);
            logcatOutput.append("\n");
        }
        return logcatOutput.toString();
    }
}
