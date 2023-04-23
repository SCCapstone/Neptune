package com.neptune.app;

import static androidx.test.espresso.matcher.ViewMatchers.withId;
import static androidx.test.espresso.action.ViewActions.click;
import static androidx.test.espresso.matcher.ViewMatchers.withText;

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
public class OpenAddDeviceActivityTest {

    @Before
    public void setUp() {
        Intents.init();
    }

    @Rule
    public ActivityScenarioRule<MainActivity> mainRule = new ActivityScenarioRule<>(MainActivity.class);

    @Test
    public void openServerSettings() {
        Espresso.onView(withId(R.id.addDev)).perform(click());
        Intents.intended(IntentMatchers.hasComponent(AddDeviceActivity.class.getName()));
    }

    @After
    public void tearDown() {
        Intents.release();
    }

}
