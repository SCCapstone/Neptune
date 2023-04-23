package com.neptune.app;

import static androidx.test.espresso.matcher.ViewMatchers.withId;
import static androidx.test.espresso.action.ViewActions.click;

import androidx.test.espresso.Espresso;
import androidx.test.espresso.intent.Intents;
import androidx.test.espresso.intent.matcher.IntentMatchers;
import androidx.test.ext.junit.rules.ActivityScenarioRule;
import androidx.test.ext.junit.runners.AndroidJUnit4;

import com.neptune.app.Backend.IPAddress;
import com.neptune.app.Backend.Server;

import org.junit.After;
import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;
import org.junit.runner.RunWith;

import java.io.IOException;
import java.util.UUID;

@RunWith(AndroidJUnit4.class)
public class OpenNotificationsSettingsTest {

    @Before
    public void setUp() {
        Intents.init();
    }

    @Rule
    public ActivityScenarioRule<MainActivity> mainRule = new ActivityScenarioRule<>(MainActivity.class);

    @Test
    public void openServerSettings() {

        try {
            //Creates a mock server so the client interactions can be tested.
            Server testServer = new Server(UUID.randomUUID(), MainActivity.configurationManager);
            testServer.friendlyName = "testServer";
            testServer.ipAddress = new IPAddress("1.1.1.1:50000");
            testServer.filesharingSettings.receivedFilesDirectory = "Pictures";
            MainActivity.serverManager.addServer(testServer);
            mainRule.getScenario().recreate();

            Espresso.onView(withId(R.id.server_name)).perform(click());
            Espresso.onView(withId(R.id.server_manage_app_notifications)).perform(click());
            Intents.intended(IntentMatchers.hasComponent(NotificationsActivity.class.getName()));

            MainActivity.serverManager.removeServer(testServer);
            testServer.delete();
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    @After
    public void tearDown() {
        Intents.release();
    }

}
