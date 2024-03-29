package com.neptune.app.Backend;

import com.neptune.app.Backend.Exceptions.InvalidIPAddress;
import com.neptune.app.Backend.Exceptions.InvalidPort;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class IPAddress {
    public final static String IPv4_REGEX = "(\\d{1,2}|(0|1)\\" + "d{2}|2[0-4]\\d|25[0-5])";

    private String IPAddress;
    private int port;

    public IPAddress(String IPAddress, int port) {
        this.setIPAddress(IPAddress);
        this.setPort(port);
    }

    public IPAddress(String combinedString) {
        String[] split = combinedString.split(":");
        this.setIPAddress(split[0]);
        this.setPort(Integer.parseInt(split[1]));
    }

    /**
     * Validates IP address. (Valid IP: X.X.X.X where 0<X<255)
     * @param address proposed IP address
     * @return valid or not
     */
    public static boolean isValidIPAddress(String address) {
        if (address.isEmpty())
            return false;

        Pattern pattern = Pattern.compile(IPv4_REGEX + "\\." + IPv4_REGEX + "\\." + IPv4_REGEX + "\\." + IPv4_REGEX);
        Matcher matcher = pattern.matcher(address);
        return matcher.matches();
    }

    /**
     * Checks if a port is valid. Greater than 1000, less than 65535
     * @param port proposed port
     * @return valid or not
     */
    public static boolean isValidPort(int port) {
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

