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

public class EnableFileSharingWidgetsTest {

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
            if(!testServer.filesharingSettings.enabled) {
                Espresso.onView(withId(R.id.filesharing_enable_title)).perform(click());
            }

            //Checks to see if the buttons are disabled because the checkbox is not checked.
            Espresso.onView(withId(R.id.btnSendFile)).check(matches(isEnabled()));
            Espresso.onView(withId(R.id.filesharing_auto_accept_files)).check(matches(isEnabled()));
            Espresso.onView(withId(R.id.filesharing_notify_on_receive)).check(matches(isEnabled()));
            Espresso.onView(withId(R.id.filesharing_server_set)).check(matches(isEnabled()));
            Espresso.onView(withId(R.id.filesharing_destination_folder_button)).check(matches(isEnabled()));

            MainActivity.serverManager.removeServer(testServer);
            testServer.delete();
        }  catch (IOException e) {
            e.printStackTrace();
        }
    }
}
