package com.neptune.app.Backend;

import androidx.annotation.NonNull;

import org.json.JSONObject;

import java.net.ServerSocket;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.concurrent.Callable;

import at.favre.lib.crypto.HKDF;
import kotlin.NotImplementedError;

public class ConnectionManager {
    protected boolean hasNegotiated;
    protected Date lastCommunicatedTime;
    protected ServerSocket ServerScoket;
    protected java.net.Socket Socket;
    // protected AsyncHttpClient AsyncHttpClient; // Eh maybe not

    private IPAddress IPAddress;
    private ConfigItem Configuration;

    private static final char[] HEX_ARRAY = "0123456789abcdef".toCharArray();
    public static String bytesToHex(byte[] bytes) {
        char[] hexChars = new char[bytes.length * 2];
        for (int j = 0; j < bytes.length; j++) {
            int v = bytes[j] & 0xFF;
            hexChars[j * 2] = HEX_ARRAY[v >>> 4];
            hexChars[j * 2 + 1] = HEX_ARRAY[v & 0x0F];
        }
        return new String(hexChars);
    }


    public IPAddress ConnectionManager(IPAddress ipAddress, ConfigItem configItem) {
        throw new NotImplementedError();
    }

    public void sendRequest(JSONObject requestData) {

    }

    public void sendRequest(String apiURL, JSONObject requestData, Callable<Void> callback) {

    }

    public boolean initiateConnection() {
        throw new NotImplementedError();
    }

    public float ping() {
        throw new NotImplementedError();
    }

    public void destroy(boolean force) {

    }

    public void setIPAddress(IPAddress ipAddress) {
        IPAddress = ipAddress;
    }

    public void setIPAddress(String ip, int port) {
        IPAddress.setIPAddress(ip);
        IPAddress.setPort(port);
    }

    public void setIPAddress(String ip) {
        IPAddress.setIPAddress(ip);
    }

    public IPAddress getIPAddress() {
        return IPAddress;
    }

    public Socket getSocket() {
        return Socket;
    }

    public ServerSocket getServerSocket() {
        return ServerScoket;
    }

    public Date getLastCommunicatedTime() {
        return lastCommunicatedTime;
    }

}
