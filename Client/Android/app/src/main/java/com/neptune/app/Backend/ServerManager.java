package com.neptune.app.Backend;

import java.util.Map;

public class ServerManager {

    private Map<String, Server> servers;

    private void removeServer() {

    }

    private void addServer() {

    }

    public ServerManager serverManager() {
        this.servers = this.servers;

        return null;
    }

    public Server pair(String name, IPAddress ipAddress) {

        return null;
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

}
