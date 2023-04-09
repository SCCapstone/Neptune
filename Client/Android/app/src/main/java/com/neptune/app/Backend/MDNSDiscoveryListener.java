package com.neptune.app.Backend;

import android.content.Context;
import android.net.nsd.NsdManager;
import android.net.nsd.NsdServiceInfo;
import android.util.Log;

public class MDNSDiscoveryListener implements NsdManager.DiscoveryListener {
    private static final String TAG = "MDNSDiscoveryListener";
    private NsdManager mNsdManager;
    private NsdManager.ResolveListener mResolveListener;

    public EventEmitter EventEmitter = new EventEmitter();

    public MDNSDiscoveryListener(Context context, NsdManager.ResolveListener resolveListener) {
        mNsdManager = (NsdManager) context.getSystemService(Context.NSD_SERVICE);
        mResolveListener = resolveListener;
    }

    @Override
    public void onStartDiscoveryFailed(String serviceType, int errorCode) {
        Log.e(TAG, "Discovery failed: " + errorCode);
    }

    @Override
    public void onStopDiscoveryFailed(String serviceType, int errorCode) {
        Log.e(TAG, "Discovery failed: " + errorCode);
    }

    @Override
    public void onDiscoveryStarted(String serviceType) {
        Log.i(TAG, "Service discovery started");
    }

    @Override
    public void onDiscoveryStopped(String serviceType) {
        Log.i(TAG, "Service discovery stopped");
    }

    @Override
    public void onServiceFound(NsdServiceInfo serviceInfo) {
        try {
            Log.i(TAG, "Service found: " + serviceInfo);
            mNsdManager.resolveService(serviceInfo, mResolveListener);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @Override
    public void onServiceLost(NsdServiceInfo serviceInfo) {
        Log.e(TAG, "Service lost: " + serviceInfo);

        try {
            this.EventEmitter.emit("lost", serviceInfo.getServiceName().substring(7));
        } catch (Exception ignored) {}
    }
}