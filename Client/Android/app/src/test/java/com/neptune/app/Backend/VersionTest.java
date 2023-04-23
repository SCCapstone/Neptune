package com.neptune.app.Backend;

import static org.junit.Assert.*;

import org.junit.Test;

public class VersionTest {

    @Test
    public void testToString() {
        Version version = new Version(1, 2, 3, "alpha", "debug");
        assertEquals("1.2.3-alpha+debug", version.toString());
    }
}