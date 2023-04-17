package com.neptune.app;

import static androidx.test.espresso.action.ViewActions.click;
import static androidx.test.espresso.matcher.ViewMatchers.withId;
import static androidx.test.espresso.matcher.ViewMatchers.isEnabled;
import static androidx.test.espresso.assertion.ViewAssertions.matches;
import static org.hamcrest.Matchers.not;

import androidx.test.espresso.Espresso;
import androidx.test.ext.junit.rules.ActivityScenarioRule;

import com.neptune.app.Backend.IPAddress;
import com.neptune.app.Backend.Server;

import org.junit.Rule;
import org.junit.Test;

import java.io.IOException;
import java.util.UUID;

public class DisableClipboardWidgetsTest {


    @Rule
    public ActivityScenarioRule<MainActivity> mainRule = new ActivityScenarioRule<>(MainActivity.class);

    @Test
    public void checkClipBoardWidgetsDisabled() {
        try {
            //Creates a mock server so the client interactions can be tested.
            Server testServer = new Server(UUID.randomUUID(), MainActivity.configurationManager);
            testServer.friendlyName = "testServer";
            testServer.ipAddress = new IPAddress("1.1.1.1:50000");
            MainActivity.serverManager.addServer(testServer);
            mainRule.getScenario().recreate();
            Espresso.onView(withId(R.id.server_name)).perform(click());

            //Making sure that the related checkbox gets unchecked.
            if(testServer.clipboardSettings.enabled) {
                Espresso.onView(withId(R.id.clipboard_enable)).perform(click());
            }

            //Checks to see if the buttons are disabled because the checkbox is not checked.
            Espresso.onView(withId(R.id.btnSendClipboard)).check(matches(not(isEnabled())));
            Espresso.onView(withId(R.id.btnReceiveClipboard)).check(matches(not(isEnabled())));
            Espresso.onView(withId(R.id.clipboard_server_get)).check(matches(not(isEnabled())));

            MainActivity.serverManager.removeServer(testServer);
            testServer.delete();
        }  catch (IOException e) {
            e.printStackTrace();
        }
    }
}
