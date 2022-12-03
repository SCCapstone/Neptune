package com.neptune.app.Backend;

import java.util.HashMap;
import java.util.Map;

public class ServerManager {

    private static Map<String, Server> servers = new HashMap<String, Server>();

    public ServerManager() {

    }

    public void removeServer(Server s) {
        servers.remove(s.getFriendlyName());
    }

    public void addServer(Server s) {
        servers.put(s.getFriendlyName(), s);
    }


    public void pair(String name, IPAddress ipAddress) {

    }

    public boolean unpair(Server server) {

        return false;
    }

    public Server getServer(String serverId) {
        return this.servers.get(serverId);
    }

    public Server[] getServers() {
        return servers.values().toArray(new Server[0]); // Maybe?
    }

    public void loadServers() {

    }

    public void saveServers() {

    }

    public void processNotification(NeptuneNotification notification) {
        for (Server server : servers.values()) {
            server.sendNotification(notification);
        }
    }

}
