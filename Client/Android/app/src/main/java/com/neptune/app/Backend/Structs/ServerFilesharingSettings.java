package com.neptune.app.Backend.Structs;

import android.os.Environment;

public class ServerFilesharingSettings {
    // If file sharing is allowed between the two devices.
    public boolean enabled = false;

    // Whether server can upload any files. This toggles the ability to receive files from the server.
    public boolean allowServerToUpload = true;
    // Whether server can download files (that we send it). This toggles the ability to send files to the server.
    public boolean allowServerToDownload = true;

    // Whether to ask the user to confirm receiving a file from the server. If false, file are automatically downloaded.
    public boolean requireConfirmationOnServerUploads = false;

    // Notify the user when a file is received (push notification)
    public boolean notifyOnServerUpload = true;

    // Where received files are saved (downloads is the default)
    public String receivedFilesDirectory = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS).getAbsolutePath();



    public ServerFilesharingSettings() {}
}
