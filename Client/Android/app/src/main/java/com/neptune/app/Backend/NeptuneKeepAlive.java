package com.neptune.app.Backend;

import android.app.Service;
import android.content.Intent;
import android.os.Handler;
import android.os.IBinder;
import android.util.Log;

import com.neptune.app.MainActivity;


/**
 * Basic service to ensure connection to servers
 */
public class NeptuneKeepAlive extends Service {
    public static final long DEFAULT_SYNC_INTERVAL = 30*1000; // 30 seconds.

    private Handler handler;
    public Runnable runnableService = new Runnable() {
        @Override
        public void run() {
            checkConnections();

            // repeat this runnable code block every ...
            handler.postDelayed(runnableService, DEFAULT_SYNC_INTERVAL);
        }
    };

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        // Create the Handler object
        handler = new Handler();
        // Execute a runnable task as soon as possible
        handler.postDelayed(runnableService, DEFAULT_SYNC_INTERVAL);

        return START_STICKY; // Restart this service if closed by the OS (low memory)
    }

    private synchronized void checkConnections() {
        if (MainActivity.serverManager != null) {
            Log.d("NeptuneKeepAlive", "Ensuring connection...");
            for (Server server : MainActivity.serverManager.getServers()) {
                try {
                    server.setupConnectionManager();
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }

        }
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
