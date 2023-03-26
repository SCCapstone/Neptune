package com.neptune.app.Backend.Structs;

public class ServerClipboardSettings {
    // Clipboard data sent/received synced between the two.
    public boolean enabled = true;
    // Allow server to update this device's clipboard data remotely
    public boolean allowServerToSet = true;
    // Allow server to request this device's clipboard data remotely
    public boolean allowServerToGet = true;
    // Send clipboard to server when this device's clipboard data changes
    public boolean synchronizeClipboardToServer = false;

    // Mainly for parity, does not effect anything. Treat as read-only.
    public boolean synchronizeClipboardToClient;

    public ServerClipboardSettings() {}
}
