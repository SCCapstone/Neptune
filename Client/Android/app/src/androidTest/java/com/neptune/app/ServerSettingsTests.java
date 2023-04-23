package com.neptune.app;

import static androidx.test.espresso.action.ViewActions.click;
import static androidx.test.espresso.action.ViewActions.scrollTo;
import static androidx.test.espresso.matcher.ViewMatchers.isDisplayed;
import static androidx.test.espresso.matcher.ViewMatchers.withId;

import androidx.test.espresso.Espresso;
import androidx.test.espresso.assertion.ViewAssertions;
import androidx.test.ext.junit.rules.ActivityScenarioRule;
import androidx.test.ext.junit.runners.AndroidJUnit4;

import com.neptune.app.Backend.IPAddress;
import com.neptune.app.Backend.Server;

import org.junit.Assert;
import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;
import org.junit.runner.RunWith;

import java.io.IOException;
import java.util.UUID;

@RunWith(AndroidJUnit4.class)
public class ServerSettingsTests {

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
    public void disableClipboardSettingsTest() {
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

            Assert.assertFalse(testServer.clipboardSettings.enabled);

        }  catch (IOException e) {
            e.printStackTrace();
        } finally {
            if (testServer != null)
                testServer.delete();
        }
    }

    @Test
    public void disableClipboardServerGetTest() {
        Server testServer = null;
        try {
            //Creates a mock server so the client interactions can be tested.
            UUID id = createServerOpenSettings();
            testServer = MainActivity.serverManager.getServer(id);

            if(!testServer.clipboardSettings.enabled) {
                Espresso.onView(withId(R.id.clipboard_enable)).perform(click());
            }

            testServer.clipboardSettings.allowServerToGet = true;
            Espresso.onView(withId(R.id.server_settings_save)).perform(click());
            //Making sure that the related checkbox gets unchecked.
            if(testServer.clipboardSettings.allowServerToGet) {
                Espresso.onView(withId(R.id.clipboard_server_get)).perform(click());
            }

            Espresso.onView(withId(R.id.server_settings_save)).perform(click());

            //Assert.assertTrue(testServer.clipboardSettings.enabled);
            Assert.assertFalse(testServer.clipboardSettings.allowServerToGet);

        }  catch (IOException e) {
            e.printStackTrace();
        } finally {
            if (testServer != null)
                testServer.delete();
        }
    }

    @Test
    public void disableFileSharingSettingsTest() {
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

            Assert.assertFalse(testServer.filesharingSettings.enabled);

        }  catch (IOException e) {
            e.printStackTrace();
        } finally {
            if (testServer != null)
                testServer.delete();
        }
    }

    @Test
    public void disableFileSharingAutoAcceptTest() {
        Server testServer = null;
        try {
            //Creates a mock server so the client interactions can be tested.
            UUID id = createServerOpenSettings();
            testServer = MainActivity.serverManager.getServer(id);

            if(!testServer.filesharingSettings.enabled) {
                Espresso.onView(withId(R.id.filesharing_enable_title)).perform(click());
            }

            testServer.filesharingSettings.requireConfirmationOnServerUploads = true;
            Espresso.onView(withId(R.id.server_settings_save)).perform(click());
            //Making sure that the related checkbox gets unchecked.
            if(testServer.filesharingSettings.requireConfirmationOnServerUploads) {
                Espresso.onView(withId(R.id.filesharing_auto_accept_files)).perform(click());
            }

            Espresso.onView(withId(R.id.server_settings_save)).perform(click());

            Assert.assertFalse(testServer.filesharingSettings.requireConfirmationOnServerUploads);

        }  catch (IOException e) {
            e.printStackTrace();
        } finally {
            if (testServer != null)
                testServer.delete();
        }
    }

    @Test
    public void disableFileSharingNotifyOnReceiveTest() {
        Server testServer = null;
        try {
            //Creates a mock server so the client interactions can be tested.
            UUID id = createServerOpenSettings();
            testServer = MainActivity.serverManager.getServer(id);

            if(!testServer.filesharingSettings.enabled) {
                Espresso.onView(withId(R.id.filesharing_enable_title)).perform(click());
            }

            testServer.filesharingSettings.notifyOnServerUpload = true;
            Espresso.onView(withId(R.id.server_settings_save)).perform(click());
            //Making sure that the related checkbox gets unchecked.
            if(testServer.filesharingSettings.notifyOnServerUpload) {
                Espresso.onView(withId(R.id.filesharing_notify_on_receive)).perform(click());
            }

            Espresso.onView(withId(R.id.server_settings_save)).perform(click());

            Assert.assertFalse(testServer.filesharingSettings.notifyOnServerUpload);

        }  catch (IOException e) {
            e.printStackTrace();
        } finally {
            if (testServer != null)
                testServer.delete();
        }
    }

    @Test
    public void disableFileSharingServerSetTest() {
        Server testServer = null;
        try {
            //Creates a mock server so the client interactions can be tested.
            UUID id = createServerOpenSettings();
            testServer = MainActivity.serverManager.getServer(id);

            if(!testServer.filesharingSettings.enabled) {
                Espresso.onView(withId(R.id.filesharing_enable_title)).perform(click());
            }

            testServer.filesharingSettings.allowServerToUpload = true;
            Espresso.onView(withId(R.id.server_settings_save)).perform(click());
            Espresso.onView(withId(R.id.filesharing_server_set)).perform(scrollTo()).check(ViewAssertions.matches(isDisplayed()));
            //Making sure that the related checkbox gets unchecked.
            if(testServer.filesharingSettings.allowServerToUpload) {
                Espresso.onView(withId(R.id.filesharing_server_set)).perform(click());
            }

            Espresso.onView(withId(R.id.server_settings_save)).perform(click());

            Assert.assertFalse(testServer.filesharingSettings.allowServerToUpload);

        }  catch (IOException e) {
            e.printStackTrace();
        } finally {
            if (testServer != null)
                testServer.delete();
        }
    }

    @Test
    public void enableClipboardSettingsTest() {
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

            Assert.assertTrue(testServer.clipboardSettings.enabled);

        }  catch (IOException e) {
            e.printStackTrace();
        } finally {
            if (testServer != null)
                testServer.delete();
        }
    }

    @Test
    public void enableClipboardServerGetTest() {
        Server testServer = null;
        try {
            //Creates a mock server so the client interactions can be tested.
            UUID id = createServerOpenSettings();
            testServer = MainActivity.serverManager.getServer(id);

            if(!testServer.clipboardSettings.enabled) {
                Espresso.onView(withId(R.id.clipboard_enable)).perform(click());
            }

            testServer.clipboardSettings.allowServerToGet = false;
            Espresso.onView(withId(R.id.server_settings_save)).perform(click());
            //Making sure that the related checkbox gets unchecked.
            if(!testServer.clipboardSettings.allowServerToGet) {
                Espresso.onView(withId(R.id.clipboard_server_get)).perform(click());
            }

            Espresso.onView(withId(R.id.server_settings_save)).perform(click());

            //Assert.assertTrue(testServer.clipboardSettings.enabled);
            Assert.assertTrue(testServer.clipboardSettings.allowServerToGet);

        }  catch (IOException e) {
            e.printStackTrace();
        } finally {
            if (testServer != null)
                testServer.delete();
        }
    }

    @Test
    public void enableFileSharingSettingsTest() {
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

            Assert.assertTrue(testServer.filesharingSettings.enabled);

        }  catch (IOException e) {
            e.printStackTrace();
        } finally {
            if (testServer != null)
                testServer.delete();
        }
    }

    @Test
    public void enableFileSharingAutoAcceptTest() {
        Server testServer = null;
        try {
            //Creates a mock server so the client interactions can be tested.
            UUID id = createServerOpenSettings();
            testServer = MainActivity.serverManager.getServer(id);

            if(!testServer.filesharingSettings.enabled) {
                Espresso.onView(withId(R.id.filesharing_enable_title)).perform(click());
            }

            testServer.filesharingSettings.requireConfirmationOnServerUploads = false;
            Espresso.onView(withId(R.id.server_settings_save)).perform(click());
            //Making sure that the related checkbox gets unchecked.
            if(!testServer.filesharingSettings.requireConfirmationOnServerUploads) {
                Espresso.onView(withId(R.id.filesharing_auto_accept_files)).perform(click());
            }

            Espresso.onView(withId(R.id.server_settings_save)).perform(click());

            Assert.assertTrue(testServer.filesharingSettings.requireConfirmationOnServerUploads);

        }  catch (IOException e) {
            e.printStackTrace();
        } finally {
            if (testServer != null)
                testServer.delete();
        }
    }

    @Test
    public void enableFileSharingNotifyOnReceiveTest() {
        Server testServer = null;
        try {
            //Creates a mock server so the client interactions can be tested.
            UUID id = createServerOpenSettings();
            testServer = MainActivity.serverManager.getServer(id);

            if(!testServer.filesharingSettings.enabled) {
                Espresso.onView(withId(R.id.filesharing_enable_title)).perform(click());
            }

            testServer.filesharingSettings.notifyOnServerUpload = false;
            Espresso.onView(withId(R.id.server_settings_save)).perform(click());
            //Making sure that the related checkbox gets unchecked.
            if(!testServer.filesharingSettings.notifyOnServerUpload) {
                Espresso.onView(withId(R.id.filesharing_notify_on_receive)).perform(click());
            }

            Espresso.onView(withId(R.id.server_settings_save)).perform(click());

            Assert.assertTrue(testServer.filesharingSettings.notifyOnServerUpload);

        }  catch (IOException e) {
            e.printStackTrace();
        } finally {
            if (testServer != null)
                testServer.delete();
        }
    }

    @Test
    public void enableFileSharingServerSetTest() {
        Server testServer = null;
        try {
            //Creates a mock server so the client interactions can be tested.
            UUID id = createServerOpenSettings();
            testServer = MainActivity.serverManager.getServer(id);

            if(!testServer.filesharingSettings.enabled) {
                Espresso.onView(withId(R.id.filesharing_enable_title)).perform(click());
            }

            testServer.filesharingSettings.allowServerToUpload = false;
            Espresso.onView(withId(R.id.server_settings_save)).perform(click());
            Espresso.onView(withId(R.id.filesharing_server_set)).perform(scrollTo()).check(ViewAssertions.matches(isDisplayed()));
            //Making sure that the related checkbox gets unchecked.
            if(!testServer.filesharingSettings.allowServerToUpload) {
                Espresso.onView(withId(R.id.filesharing_server_set)).perform(click());
            }

            Espresso.onView(withId(R.id.server_settings_save)).perform(click());

            Assert.assertTrue(testServer.filesharingSettings.allowServerToUpload);

        }  catch (IOException e) {
            e.printStackTrace();
        } finally {
            if (testServer != null)
                testServer.delete();
        }
    }
}