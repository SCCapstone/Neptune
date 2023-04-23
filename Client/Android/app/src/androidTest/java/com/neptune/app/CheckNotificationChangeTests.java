package com.neptune.app;

import static androidx.test.espresso.action.ViewActions.click;
import static androidx.test.espresso.action.ViewActions.scrollTo;
import static androidx.test.espresso.assertion.ViewAssertions.matches;
import static androidx.test.espresso.matcher.ViewMatchers.hasSibling;
import static androidx.test.espresso.matcher.ViewMatchers.isChecked;
import static androidx.test.espresso.matcher.ViewMatchers.withId;
import static androidx.test.espresso.matcher.ViewMatchers.withText;

import static org.hamcrest.CoreMatchers.allOf;
import static org.hamcrest.CoreMatchers.instanceOf;
import static org.hamcrest.CoreMatchers.not;
import static org.junit.Assert.fail;

import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.content.res.Resources;
import android.graphics.drawable.Drawable;
import android.util.Log;
import android.widget.CheckBox;
import android.widget.TextView;

import androidx.test.espresso.Espresso;
import androidx.test.espresso.ViewAssertion;
import androidx.test.ext.junit.rules.ActivityScenarioRule;

import com.neptune.app.Backend.IPAddress;
import com.neptune.app.Backend.Server;

import org.junit.Assert;
import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.TreeMap;
import java.util.UUID;

public class CheckNotificationChangeTests {
    @Rule
    public ActivityScenarioRule<MainActivity> mainRule = new ActivityScenarioRule<>(MainActivity.class);

    @Before
    public void disableAnimations() {
        // Disable animations
        mainRule.getScenario().onActivity(activity -> {
            activity.getSupportFragmentManager().beginTransaction().setCustomAnimations(0,0).commitAllowingStateLoss();
        });
    }

    /*private HashMap<String, String> appNames = notifRule.getScenario().onActivity(activity -> {
        activity.getApplicationNamesToPackageNames();
    });*/

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
    public void disableNotificationTest() {
        Server testServer = null;
        try {
            //Creates a mock server so the client interactions can be tested.
            UUID id = createServerOpenSettings();
            testServer = MainActivity.serverManager.getServer(id);

            Espresso.onView(withId(R.id.server_manage_app_notifications)).perform(click());
            Espresso.onView(hasSibling(withText("Phone"))).perform(scrollTo());
            Espresso.onView(allOf(withId(R.id.appName), instanceOf(CheckBox.class), withText("Phone"))).perform(click());

            if(testServer.notificationBlacklistApps.size() == 0)
                fail();

            int i;
            for(i=0; i<testServer.notificationBlacklistApps.size(); i++) {
                //Log.w("BRUH", testServer.notificationBlacklistApps.get(i));
                if (testServer.notificationBlacklistApps.get(i).equals("com.android.dialer")) {
                    Assert.assertTrue(true);
                    return;
                }
            }
        } catch (IOException e) {
            e.printStackTrace();
        } finally {
            if (testServer != null)
                testServer.delete();
        }
        Assert.assertTrue(false);
    }

    @Test
    public void enableNotificationTest() {
        Server testServer = null;
        try {
            //Creates a mock server so the client interactions can be tested.
            UUID id = createServerOpenSettings();
            testServer = MainActivity.serverManager.getServer(id);

            Espresso.onView(withId(R.id.server_manage_app_notifications)).perform(click());
            Espresso.onView(hasSibling(withText("Phone"))).perform(scrollTo());
            Espresso.onView(allOf(withId(R.id.appName), instanceOf(CheckBox.class), withText("Phone"))).perform(click());

            if(testServer.notificationBlacklistApps.size() == 0)
                fail();

            Espresso.onView(allOf(withId(R.id.appName), instanceOf(CheckBox.class), withText("Phone"))).check(matches(not(isChecked())));

            int i;
            for(i=0; i<testServer.notificationBlacklistApps.size(); i++) {
                if (testServer.notificationBlacklistApps.get(i).equals("com.android.dialer")) {
                    break;
                }
            }

            Espresso.onView(hasSibling(withText("Phone"))).perform(scrollTo());
            Espresso.onView(allOf(withId(R.id.appName), instanceOf(CheckBox.class), withText("Phone"))).perform(click());

            if(testServer.notificationBlacklistApps.size() == 0) {
                Espresso.onView(allOf(withId(R.id.appName), instanceOf(CheckBox.class), withText("Phone"))).check(matches(isChecked()));
                Assert.assertTrue(true);
                return;
            }
        } catch (IOException e) {
            e.printStackTrace();
        } finally {
            if (testServer != null)
                testServer.delete();
        }
        Assert.assertTrue(false);
    }

    @Test
    public void disableAllNotificationsTest() {
        Server testServer = null;
        try {
            //Creates a mock server so the client interactions can be tested.
            UUID id = createServerOpenSettings();
            testServer = MainActivity.serverManager.getServer(id);

            Espresso.onView(withId(R.id.server_manage_app_notifications)).perform(click());
            Espresso.onView(withId(R.id.btnUncheckAll)).perform(click());

            ArrayList<String> appNames = NotificationsActivity.allAppNames;
            ArrayList<String> packageNames = NotificationsActivity.allPackageNames;
            Assert.assertEquals(appNames.size(), testServer.notificationBlacklistApps.size());
            Assert.assertEquals(packageNames.size(), testServer.notificationBlacklistApps.size());
            Assert.assertEquals(appNames.size(), packageNames.size());

            if((testServer.notificationBlacklistApps.size() == 0) || (appNames.size() == 0) || (packageNames.size() == 0))
                fail();

            for(int i=0; i<testServer.notificationBlacklistApps.size(); i++) {
                if(!testServer.notificationBlacklistApps.contains(packageNames.get(i)))
                    fail();
                Espresso.onView(allOf(withId(R.id.appName), instanceOf(CheckBox.class), withText(appNames.get(i)))).check(matches(not(isChecked())));
            }
            Assert.assertTrue(true);
            return;
        } catch (IOException e) {
            e.printStackTrace();
        } finally {
            if (testServer != null)
                testServer.delete();
        }
        fail();
    }

    @Test
    public void enableAllNotificationsTest() {
        Server testServer = null;
        try {
            //Creates a mock server so the client interactions can be tested.
            UUID id = createServerOpenSettings();
            testServer = MainActivity.serverManager.getServer(id);

            Espresso.onView(withId(R.id.server_manage_app_notifications)).perform(click());
            Espresso.onView(withId(R.id.btnUncheckAll)).perform(click());

            ArrayList<String> appNames = NotificationsActivity.allAppNames;
            ArrayList<String> packageNames = NotificationsActivity.allPackageNames;
            Assert.assertEquals(appNames.size(), testServer.notificationBlacklistApps.size());
            Assert.assertEquals(packageNames.size(), testServer.notificationBlacklistApps.size());
            Assert.assertEquals(appNames.size(), packageNames.size());

            if((testServer.notificationBlacklistApps.size() == 0) || (appNames.size() == 0) || (packageNames.size() == 0))
                fail();

            for(int i=0; i<testServer.notificationBlacklistApps.size(); i++) {
                if(!testServer.notificationBlacklistApps.contains(packageNames.get(i)))
                    fail();
                Espresso.onView(allOf(withId(R.id.appName), instanceOf(CheckBox.class), withText(appNames.get(i)))).check(matches(not(isChecked())));
            }

            Espresso.onView(withId(R.id.btnCheckAlll)).perform(click());
            if(testServer.notificationBlacklistApps.size() == 0) {
                for(int j=0; j<appNames.size(); j++) {
                    Espresso.onView(allOf(withId(R.id.appName), instanceOf(CheckBox.class), withText(appNames.get(j)))).check(matches(isChecked()));
                }
                return;
            }

        } catch (IOException e) {
            e.printStackTrace();
        } finally {
            if (testServer != null)
                testServer.delete();
        }
        fail();
    }
}