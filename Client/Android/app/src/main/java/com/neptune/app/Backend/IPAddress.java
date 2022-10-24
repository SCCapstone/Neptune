package com.neptune.app.Backend;

import android.content.Intent;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class IPAddress {
    private String IPAddress;
    private int port;

    public IPAddress(String IPAddress, int port) {
        this.IPAddress = IPAddress;
        this.port = port;
    }

    /**
     * Validates IP address. (Valid IP: X.X.X.X where 0<X<255)
     * @param address proposed IP address
     * @return valid or not
     */
    public boolean isValidIPAddress(String address) {
        if (address.isEmpty())
            return false;

        String ipSection = "(\\d{1,2}|(0|1)\\" + "d{2}|2[0-4]\\d|25[0-5])";

        Pattern pattern = Pattern.compile(ipSection + "\\." + ipSection + "\\." + ipSection + "\\." + ipSection);
        Matcher matcher = pattern.matcher(address);
        return matcher.matches();
    }

    /**
     * Checks if a port is valid. Greater than 1000, less than 65535
     * @param port proposed port
     * @return valid or not
     */
    public boolean isValidPort(int port) {
        return (port > 1000 && port < 65535); // Update later with actual approved Android specs
    }

    public String getIPAddress() {
        return IPAddress;
    }

    public int getPort() {
        return port;
    }

    /**
     * Set the port. Must be a valid port less than 65535 greater than 1000
     * @param port new port value
     */
    public void setPort(int port) {
        if (isValidPort(port))
            this.port = port;
        else
            throw new InvalidPort(port);
    }

    /**
     * Set the IP address. Must be a valid IP address (X.X.X.X where 0<X<255)
     * @param IPAddress
     */
    public void setIPAddress(String IPAddress) {
        if (isValidIPAddress(IPAddress))
            this.IPAddress = IPAddress;
        else
            throw new InvalidIPAddress(IPAddress);
    }

    @Override
    /**
     * Returns the string interpretation of the IP address
     */
    public String toString() {
        return IPAddress + ":" + port;
    }
}

class InvalidPort extends Error {
    InvalidPort(int port) {
        super("Invalid port supplied: " + port);
    }
}

class InvalidIPAddress extends Error {
    InvalidIPAddress(String ip) {
        super("Invalid IP address supplied: " + ip);
    }
}
