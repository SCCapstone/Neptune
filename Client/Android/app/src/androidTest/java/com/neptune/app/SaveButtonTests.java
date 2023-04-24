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

import java.io.IOException;
import java.util.UUID;

public class SaveButtonTests {

    @Rule
    public ActivityScenarioRule<MainActivity> mainRule = new ActivityScenarioRule<>(MainActivity.class);

    @Before
    public void disableAnimations() {
        // Disable animations
        mainRule.getScenario().onActivity(activity -> {
            activity.getSupportFragmentManager().beginTransaction().setCustomAnimations(0,0).commitAllowingStateLoss();
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
    public void disableAllSaveButtonTest() {
        Server testServer = null;
        try {
            //Creates a mock server so the client interactions can be tested.
            UUID id = createServerOpenSettings();
            testServer = MainActivity.serverManager.getServer(id);

            Espresso.onView(withId(R.id.server_sync_notifications)).perform(click());
            Espresso.onView(withId(R.id.server_settings_save)).perform(click());
            Espresso.onView(withId(R.id.clipboard_server_get)).perform(click());
            Espresso.onView(withId(R.id.clipboard_enable)).perform(click());
            Espresso.onView(withId(R.id.filesharing_auto_accept_files)).perform(click());
            Espresso.onView(withId(R.id.filesharing_notify_on_receive)).perform(click());
            Espresso.onView(withId(R.id.filesharing_server_set)).perform(scrollTo()).perform(click());
            Espresso.onView(withId(R.id.filesharing_enable_title)).perform(click());

            Espresso.onView(withId(R.id.server_settings_save)).perform(click());

            Assert.assertFalse(testServer.syncNotifications);
            Assert.assertFalse(testServer.clipboardSettings.enabled);
            Assert.assertFalse(testServer.clipboardSettings.allowServerToGet);
            Assert.assertFalse(testServer.clipboardSettings.synchronizeClipboardToServer);
            Assert.assertFalse(testServer.filesharingSettings.enabled);
            Assert.assertFalse(testServer.filesharingSettings.allowServerToUpload);
            Assert.assertFalse(testServer.filesharingSettings.notifyOnServerUpload);
            Assert.assertFalse(testServer.filesharingSettings.requireConfirmationOnServerUploads);
        }  catch (IOException e) {
            e.printStackTrace();
        } finally {
            if (testServer != null)
                testServer.delete();
        }
    }

    @Test
    public void enableAllSaveButtonTest() {
        Server testServer = null;
        try {
            //Creates a mock server so the client interactions can be tested.
            UUID id = createServerOpenSettings();
            testServer = MainActivity.serverManager.getServer(id);

            //Uncheck everything so we can see if checking everything will save correctly. We know this works from the test above.
            Espresso.onView(withId(R.id.server_sync_notifications)).perform(click());
            Espresso.onView(withId(R.id.clipboard_server_get)).perform(click());
            Espresso.onView(withId(R.id.clipboard_enable)).perform(click());
            Espresso.onView(withId(R.id.filesharing_auto_accept_files)).perform(click());
            Espresso.onView(withId(R.id.filesharing_notify_on_receive)).perform(click());
            Espresso.onView(withId(R.id.filesharing_server_set)).perform(scrollTo()).perform(click());
            Espresso.onView(withId(R.id.filesharing_enable_title)).perform(click());

            Espresso.onView(withId(R.id.server_settings_save)).perform(click());

            Espresso.onView(withId(R.id.server_sync_notifications)).perform(click());
            Espresso.onView(withId(R.id.clipboard_enable)).perform(click());
            Espresso.onView(withId(R.id.clipboard_server_get)).perform(click());
            Espresso.onView(withId(R.id.filesharing_enable_title)).perform(click());
            Espresso.onView(withId(R.id.filesharing_auto_accept_files)).perform(click());
            Espresso.onView(withId(R.id.filesharing_notify_on_receive)).perform(click());
            Espresso.onView(withId(R.id.filesharing_server_set)).perform(scrollTo()).perform(click());

            //Now we check everything and see if it saves correctly.
            Espresso.onView(withId(R.id.server_settings_save)).perform(click());

            Assert.assertTrue(testServer.syncNotifications);
            Assert.assertTrue(testServer.clipboardSettings.enabled);
            Assert.assertTrue(testServer.clipboardSettings.allowServerToGet);
            Assert.assertTrue(testServer.filesharingSettings.enabled);
            Assert.assertTrue(testServer.filesharingSettings.allowServerToUpload);
            Assert.assertTrue(testServer.filesharingSettings.notifyOnServerUpload);
            Assert.assertTrue(testServer.filesharingSettings.requireConfirmationOnServerUploads);
        }  catch (IOException e) {
            e.printStackTrace();
        } finally {
            if (testServer != null)
                testServer.delete();
        }
    }
}
