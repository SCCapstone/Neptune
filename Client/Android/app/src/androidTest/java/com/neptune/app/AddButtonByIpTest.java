package com.neptune.app;

import static androidx.test.espresso.action.ViewActions.click;
import static androidx.test.espresso.matcher.ViewMatchers.withId;
import static androidx.test.espresso.matcher.ViewMatchers.withText;

import static com.neptune.app.MainActivity.serverManager;

import static org.junit.Assert.fail;

import android.app.AlertDialog;
import android.view.View;

import androidx.test.espresso.Espresso;
import androidx.test.espresso.action.ViewActions;
import androidx.test.ext.junit.rules.ActivityScenarioRule;

import com.neptune.app.Backend.IPAddress;
import com.neptune.app.Backend.Server;

import org.junit.Assert;
import org.junit.Rule;
import org.junit.Test;

import java.io.IOException;
import java.util.UUID;

public class AddButtonByIpTest {

    @Rule
    public ActivityScenarioRule<MainActivity> mainRule = new ActivityScenarioRule<>(MainActivity.class);

    @Test
    public void addText() {
        Espresso.onView(withId(R.id.addDev)).perform(click());
        Espresso.onView(withId(R.id.add_server_by_ip)).perform(click());
        Espresso.onView(withId(R.id.nameEdit)).perform(ViewActions.typeText("Test Computer"));
        Espresso.onView(withId(R.id.ipEdit)).perform(ViewActions.typeText("1.1.1.1"));
        Espresso.onView(withText("OK")).perform(click());

        Server[] servers = serverManager.getServers();
        int count = 0;
        for(Server server: servers) {
            if(server.ipAddress.getIPAddress().equals("1.1.1.1")) {
                Assert.assertTrue(true);
                server.delete();
            } else {
                count++;
            }
        }

        if(count == servers.length)
            fail();

    }
}