package com.neptune.app;

import static androidx.test.espresso.action.ViewActions.click;
import static androidx.test.espresso.assertion.ViewAssertions.matches;
import static androidx.test.espresso.matcher.ViewMatchers.isEnabled;
import static androidx.test.espresso.matcher.ViewMatchers.withId;

import static org.hamcrest.Matchers.not;

import androidx.test.espresso.Espresso;
import androidx.test.ext.junit.rules.ActivityScenarioRule;
import androidx.test.ext.junit.runners.AndroidJUnit4;

import com.neptune.app.Backend.IPAddress;
import com.neptune.app.Backend.Server;

import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;
import org.junit.runner.RunWith;

import java.io.IOException;
import java.util.UUID;

@RunWith(AndroidJUnit4.class)
public class ServerWidgetsTests {

    @Rule
    public ActivityScenarioRule<MainActivity> mainRule = new ActivityScenarioRule<>(MainActivity.class);

    @Before
    public void disableAnimations() {
        // Disable animations
        mainRule.getScenario().onActivity(activity -> {
            activity.getSupportFragmentManager().beginTransaction().setCustomAnimations(0, 0).commitAllowingStateLoss();
        });
    }

    private UUID createServerOpenSettings() throws IOException {
        UUID id = UUID.randomUUID();
        Server testServer = new Server(id.toString(), MainActivity.configurationManager);
        testServer.friendlyName = "testServer";
        testServer.ipAddress = new IPAddress("1.1.1.1:50000");
        testServer.filesharingSettings.receivedFilesDirectory = "Pictures";

        MainActivity.serverManager.addServer(testServer);

        mainRule.getScenario().recreate();
        Espresso.onView(withId(R.id.server_name)).perform(click());

        return id;
    }

    @Test
    public void disableClipboardWidgetsTest() {
        Server testServer = null;
        try {
            //Creates a mock server so the client interactions can be tested.
            UUID id = createServerOpenSettings();
            testServer = MainActivity.serverManager.getServer(id);

            testServer.clipboardSettings.enabled = true;
            Espresso.onView(withId(R.id.server_settings_save)).perform(click());
            //Making sure that the related checkbox gets unchecked.
            if(testServer.clipboardSettings.enabled) {
                Espresso.onView(withId(R.id.clipboard_enable)).perform(click());
            }

            Espresso.onView(withId(R.id.server_settings_save)).perform(click());

            //Checks to see if the buttons are disabled because the checkbox is not checked.
            Espresso.onView(withId(R.id.btnSendClipboard)).check(matches(not(isEnabled())));
            Espresso.onView(withId(R.id.btnReceiveClipboard)).check(matches(not(isEnabled())));
            Espresso.onView(withId(R.id.clipboard_server_get)).check(matches(not(isEnabled())));

        } catch (IOException e) {
            e.printStackTrace();
        } finally {
            if (testServer != null)
                testServer.delete();
        }
    }

    @Test
    public void disableFileSharingWidgetsTest() {
        Server testServer = null;
        try {
            //Creates a mock server so the client interactions can be tested.
            UUID id = createServerOpenSettings();
            testServer = MainActivity.serverManager.getServer(id);

            testServer.filesharingSettings.enabled = true;
            Espresso.onView(withId(R.id.server_settings_save)).perform(click());
            //Making sure that the related checkbox gets unchecked.
            if(testServer.filesharingSettings.enabled) {
                Espresso.onView(withId(R.id.filesharing_enable_title)).perform(click());
            }

            Espresso.onView(withId(R.id.server_settings_save)).perform(click());

            //Checks to see if the buttons are disabled because the checkbox is not checked.
            Espresso.onView(withId(R.id.btnSendFile)).check(matches(not(isEnabled())));
            Espresso.onView(withId(R.id.filesharing_auto_accept_files)).check(matches(not(isEnabled())));
            Espresso.onView(withId(R.id.filesharing_notify_on_receive)).check(matches(not(isEnabled())));
            Espresso.onView(withId(R.id.filesharing_server_set)).check(matches(not(isEnabled())));
            Espresso.onView(withId(R.id.filesharing_destination_folder_button)).check(matches(not(isEnabled())));

        } catch (IOException e) {
            e.printStackTrace();
        } finally {
            if (testServer != null)
                testServer.delete();
        }
    }

    @Test
    public void enableClipboardWidgetsTest() {
        Server testServer = null;
        try {
            //Creates a mock server so the client interactions can be tested.
            UUID id = createServerOpenSettings();
            testServer = MainActivity.serverManager.getServer(id);

            testServer.clipboardSettings.enabled = false;
            Espresso.onView(withId(R.id.server_settings_save)).perform(click());
            //Making sure that the related checkbox gets unchecked.
            if(!testServer.clipboardSettings.enabled) {
                Espresso.onView(withId(R.id.clipboard_enable)).perform(click());
            }

            Espresso.onView(withId(R.id.server_settings_save)).perform(click());

            //Checks to see if the buttons are disabled because the checkbox is not checked.
            Espresso.onView(withId(R.id.btnSendClipboard)).check(matches(isEnabled()));
            Espresso.onView(withId(R.id.btnReceiveClipboard)).check(matches(isEnabled()));
            Espresso.onView(withId(R.id.clipboard_server_get)).check(matches(isEnabled()));

        } catch (IOException e) {
            e.printStackTrace();
        } finally {
            if (testServer != null)
                testServer.delete();
        }
    }

    @Test
    public void enableFileSharingWidgetsTest() {
        Server testServer = null;
        try {
            //Creates a mock server so the client interactions can be tested.
            UUID id = createServerOpenSettings();
            testServer = MainActivity.serverManager.getServer(id);

            testServer.filesharingSettings.enabled = false;
            Espresso.onView(withId(R.id.server_settings_save)).perform(click());
            //Making sure that the related checkbox gets unchecked.
            if(!testServer.filesharingSettings.enabled) {
                Espresso.onView(withId(R.id.filesharing_enable_title)).perform(click());
            }

            Espresso.onView(withId(R.id.server_settings_save)).perform(click());

            //Checks to see if the buttons are disabled because the checkbox is not checked.
            Espresso.onView(withId(R.id.btnSendFile)).check(matches(isEnabled()));
            Espresso.onView(withId(R.id.filesharing_auto_accept_files)).check(matches(isEnabled()));
            Espresso.onView(withId(R.id.filesharing_notify_on_receive)).check(matches(isEnabled()));
            Espresso.onView(withId(R.id.filesharing_server_set)).check(matches(isEnabled()));
            Espresso.onView(withId(R.id.filesharing_destination_folder_button)).check(matches(isEnabled()));

        } catch (IOException e) {
            e.printStackTrace();
        } finally {
            if (testServer != null)
                testServer.delete();
        }
    }
}