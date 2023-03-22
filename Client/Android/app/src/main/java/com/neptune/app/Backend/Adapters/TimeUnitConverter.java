package com.neptune.app.Backend.Adapters;

import java.util.concurrent.TimeUnit;

public class TimeUnitConverter {
    public static String toString(TimeUnit unit) {
        switch (unit) {
            case NANOSECONDS:
                return "nanoSeconds";
            case MICROSECONDS:
                return "microSeconds";
            case MILLISECONDS:
                return "milliSeconds";
            case SECONDS:
                return "seconds";
            case MINUTES:
                return "minutes";
            case HOURS:
                return "hours";
            case DAYS:
                return "days";
            default:
                throw new IllegalArgumentException("Unknown TimeUnit value: " + unit);
        }
    }

    public static TimeUnit fromString(String unitStr) {
        switch (unitStr) {
            case "nanoSeconds":
                return TimeUnit.NANOSECONDS;
            case "microSeconds":
                return TimeUnit.MICROSECONDS;
            case "milliSeconds":
                return TimeUnit.MILLISECONDS;
            case "seconds":
                return TimeUnit.SECONDS;
            case "minutes":
                return TimeUnit.MINUTES;
            case "hours":
                return TimeUnit.HOURS;
            case "days":
                return TimeUnit.DAYS;
            default:
                throw new IllegalArgumentException("Unknown TimeUnit string: " + unitStr);
        }
    }

}
