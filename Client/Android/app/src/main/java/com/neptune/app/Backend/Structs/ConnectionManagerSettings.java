package com.neptune.app.Backend.Structs;

import java.util.concurrent.TimeUnit;

public class ConnectionManagerSettings {
    public int pollingInterval = 2; // 2 Minutes
    public TimeUnit pollingIntervalTimeUnit = TimeUnit.MINUTES;

    public int pingInterval = 1;
    public TimeUnit pingIntervalTimeUnit = TimeUnit.MINUTES;
}
