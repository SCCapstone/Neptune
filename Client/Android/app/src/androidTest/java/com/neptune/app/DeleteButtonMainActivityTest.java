package com.neptune.app;

import static androidx.test.espresso.action.ViewActions.click;
import static androidx.test.espresso.matcher.ViewMatchers.withId;
import static androidx.test.espresso.matcher.ViewMatchers.withText;

import static com.neptune.app.MainActivity.serverManager;

import static org.junit.Assert.fail;

import androidx.test.espresso.Espresso;
import androidx.test.ext.junit.rules.ActivityScenarioRule;

import com.neptune.app.Backend.IPAddress;
import com.neptune.app.Backend.Server;

import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;

import java.io.IOException;
import java.util.UUID;

public class DeleteButtonMainActivityTest {

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
    public void deleteButtonMainActivityTest() {
        Server testServer = null;
        try {
            //Creates a mock server so the client interactions can be tested.
            UUID id = UUID.randomUUID();
            testServer = new Server(id.toString(), MainActivity.configurationManager);
            testServer.friendlyName = "testServer";
            testServer.ipAddress = new IPAddress("1.1.1.1:50000");

            MainActivity.serverManager.addServer(testServer);

            mainRule.getScenario().recreate();
            testServer = MainActivity.serverManager.getServer(id);

            Server[] servers = serverManager.getServers();
            if(servers.length <= 0)
                fail();

            Espresso.onView(withId(R.id.server_item_delete)).perform(click());
            Espresso.onView(withText("YES")).perform(click());

            servers = serverManager.getServers();
            for(int i=0; i<servers.length; i++) {
                if(servers[i].serverId == id)
                    fail();
            }
        } catch (IOException e) {
            e.printStackTrace();
        } finally {
            if (testServer != null)
                testServer.delete();
        }
    }
}
