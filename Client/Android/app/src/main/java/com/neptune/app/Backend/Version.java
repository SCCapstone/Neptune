package com.neptune.app.Backend;

import org.intellij.lang.annotations.RegExp;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

// Semantic versioning ( v1.5.2-release+Build2403 )
public class Version {
    final static String version_regex = "^(?<major>0|[1-9]\\d*)\\.(?<minor>0|[1-9]\\d*)\\.(?<patch>0|[1-9]\\d*)(?:-(?<prerelease>(?:0|[1-9]\\d*|\\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\\.(?:0|[1-9]\\d*|\\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\\+(?<buildmetadata>[0-9a-zA-Z-]+(?:\\.[0-9a-zA-Z-]+)*))?$";
    public int major = 0;
    public int minor = 0;
    public int patch = 0;
    public String preRelease = "";
    public String metaData = "";

    public Version() {}

    public Version(int major) {
        this.major = major;
    }

    /**
     * Load a version string (0.0.0-a+b) or treat the string as the major version
     * @param versionString Either a version string (0.0.0-a+b) or major version
     */
    public Version(String versionString) {
        Pattern versionPattern = Pattern.compile(version_regex);
        Matcher matcher = versionPattern.matcher(versionString);
        if (matcher.matches()) {
            this.major = Integer.parseInt(matcher.group(1));
            this.minor = Integer.parseInt(matcher.group(2));
            this.patch = Integer.parseInt(matcher.group(3));
            this.preRelease = matcher.group(4);
            this.metaData = matcher.group(5);
        } else {
            this.major = Integer.parseInt(versionString);
        }
    }

    public Version(int major, int minor) {
        this(major);
        this.minor = minor;
    }
    public Version(String major, String minor) {
        this(major);
        this.minor = Integer.parseInt(minor);
    }

    public Version(int major, int minor, int patch) {
        this(major, minor);
        this.patch = patch;
    }
    public Version(String major, String minor, String patch) {
        this(major, minor);
        this.patch = Integer.parseInt(patch);
    }

    public Version(int major, int minor, int patch, String preRelease) {
        this(major, minor, patch);
        this.preRelease = preRelease;
    }
    public Version(String major, String minor, String patch, String preRelease) {
        this(major, minor, patch);
        this.preRelease = preRelease;
    }
    public Version(int major, int minor, int patch, int preRelease) {
        this(major, minor, patch, String.valueOf(preRelease));
    }

    public Version(int major, int minor, int patch, String preRelease, String metaData) {
        this(major, minor, patch, preRelease);
        this.metaData = metaData;
    }
    public Version(String major, String minor, String patch, String preRelease, String metaData) {
        this(major, minor, patch, preRelease);
        this.metaData = metaData;
    }
    public Version(int major, int minor, int patch, int preRelease, int metaData) {
        this(major, minor, patch, preRelease);
        this.metaData = String.valueOf(metaData);
    }


    /**
     * Convert the version to a readable string following the semantic styling
     * @param wrapInBracket Whether to wrap the prerelease and metadata information in brackets
     *                      `major.minor.patch{prerelease}[metadata]`
     * @return major.minor.patch-preRelease+metaData or major.minor.patch{preRelease}[metaData]
     */
    public String toString(boolean wrapInBracket) {
        StringBuilder str = new StringBuilder();
        str.append(major);
        str.append(".");
        str.append(minor);
        str.append(".");
        str.append(patch);

        if (preRelease != null) {
            if (!preRelease.isEmpty()) {
                if (wrapInBracket)
                    str.append("{" + preRelease + "}");
                else
                    str.append("-" + preRelease);
            }
        }

        if (metaData != null) {
            if (!metaData.isEmpty()) {
                if (wrapInBracket)
                    str.append("[" + metaData + "]");
                else
                    str.append("+" + metaData);
            }
        }

        return str.toString();
    }

    /**
     * Convert the version to a readable string following the semantic styling
     * @return major.minor.patch-preRelease+metaData
     */
    public String toString() {
        return toString(false);
    }
}
