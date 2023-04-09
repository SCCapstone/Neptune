package com.neptune.app.Backend;

import android.net.nsd.NsdManager;
import android.net.nsd.NsdServiceInfo;
import android.util.Log;

import java.nio.charset.StandardCharsets;
import java.util.Map;

public class MDNSResolver implements NsdManager.ResolveListener {
    private static final String TAG = "MDNSResolver";

    public EventEmitter EventEmitter = new EventEmitter();

    @Override
    public void onResolveFailed(NsdServiceInfo serviceInfo, int errorCode) {
        Log.e(TAG, "Resolve failed: " + errorCode);
    }

    @Override
    public void onServiceResolved(NsdServiceInfo serviceInfo) {
        Log.i(TAG, "Service resolved: " + serviceInfo);

        try {
            NeptuneService service = new NeptuneService(serviceInfo);
            EventEmitter.emit("discovered", service);
        } catch (Exception ignored) {
            ignored.printStackTrace();
        }
    }

    public static class NeptuneService {
        public String serverId;
        public String friendlyName;
        public IPAddress ipAddress;
        public Version version;

        public String serviceName;

        public NeptuneService() {}

        public NeptuneService(NsdServiceInfo serviceInfo) {
            this.serviceName = serviceInfo.getServiceName();
            this.serverId = serviceInfo.getServiceName().substring(7);
            this.ipAddress = new IPAddress(serviceInfo.getHost().getHostAddress(), serviceInfo.getPort());
            this.friendlyName = serverId;

            Map<String, byte[]> attributes = serviceInfo.getAttributes();
            if (attributes.containsKey("version")) {
                String versionString = new String(attributes.get("version"), StandardCharsets.UTF_8);
                this.version = new Version(versionString);
            }

            if (serviceInfo.getAttributes().containsKey("name")) {
                String friendlyName = new String(attributes.get("name"), StandardCharsets.UTF_8);
                this.friendlyName = friendlyName;
            }
        }
    }
}