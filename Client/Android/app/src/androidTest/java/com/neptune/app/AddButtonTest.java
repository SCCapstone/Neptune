package com.neptune.app;

import static androidx.test.espresso.action.ViewActions.click;
import static androidx.test.espresso.matcher.ViewMatchers.withId;
import static androidx.test.espresso.matcher.ViewMatchers.withText;

import androidx.test.espresso.Espresso;
import androidx.test.espresso.action.ViewActions;
import androidx.test.ext.junit.rules.ActivityScenarioRule;

import org.junit.Rule;
import org.junit.Test;

public class AddButtonTest {

    @Rule
    public ActivityScenarioRule<MainActivity> addRule = new ActivityScenarioRule<>(MainActivity.class);

    @Test
    public void addText() {
        Espresso.onView(withId(R.id.addDev)).perform(click());
        Espresso.onView(withId(R.id.nameEdit)).perform(ViewActions.typeText("John Doe"));
        Espresso.onView(withId(R.id.ipEdit)).perform(ViewActions.typeText("192.158.1.38"));
        Espresso.onView(withText(R.id.server_name)).equals(Espresso.onView(withText(R.id.nameEdit)));
    }
}