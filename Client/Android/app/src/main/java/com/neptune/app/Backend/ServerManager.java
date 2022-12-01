package com.neptune.app.Backend;

import java.util.HashMap;
import java.util.Map;

public class ServerManager {

    private static Map<String, Server> servers;

    public ServerManager () {
        servers = new HashMap<String, Server>();
    }

    public void removeServer(Server s) {
        servers.remove(s.getFriendlyName());
    }

    public void addServer(Server s) {
        servers.put(s.getFriendlyName(), s);
    }

    public ServerManager serverManager() {
        this.servers = this.servers; //I think we should set this equal to a new HashMap or something. A type of map that lets the frontend access the info and
                                        //add, delete, or edit the information the easiest.
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
