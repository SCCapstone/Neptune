package com.neptune.app.Backend;

import com.neptune.app.MainActivity;

import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public class ServerManager {
    private HashMap<UUID, Server> servers;
    private ConfigurationManager configurationManager;
    private ClientConfig clientConfig;

    public ServerManager(ClientConfig clientConfig, ConfigurationManager configurationManager) {
        this.clientConfig = clientConfig;
        this.configurationManager = configurationManager;
        loadServers();
    }

    public void removeServer(Server s) {
        servers.remove(s.serverId);
        saveServers();
    }

    public void addServer(Server s) {
        servers.put(s.serverId, s);
        saveServers();
    }


    public void pair(UUID serverId, IPAddress ipAddress) {
        Server server = servers.get(serverId);
        server.ipAddress = ipAddress;
        server.pair();
    }

    public boolean unpair(UUID server) {
        return servers.get(server).unpair();
    }

    public Server getServer(String serverId) {
        return servers.get(serverId);
    }

    public Server[] getServers() {
        return (Server[])servers.values().toArray(); // Maybe?
    }

    public void loadServers() {
        servers = new HashMap<UUID, Server>();

        ArrayList<String> removeTheseIds = new ArrayList<>();

        for (String serverId : clientConfig.savedServerIds) {
            try {
                servers.put(UUID.fromString(serverId), new Server(serverId, configurationManager));
            } catch (IOException e) {
                // Remove ID
                removeTheseIds.add(serverId);
            }
        }

        if (removeTheseIds.size() > 0) {
            String[] newArray = new String[clientConfig.savedServerIds.length-removeTheseIds.size()];

            String savedId;

            int newArrayIndex = 0;
            for (int i = 0; i<clientConfig.savedServerIds.length; i++) {
                savedId = clientConfig.savedServerIds[i];

                if (removeTheseIds.contains(savedId))
                    continue;
                else {
                    newArray[newArrayIndex] = savedId;
                    newArrayIndex++;
                }
            }

            clientConfig.savedServerIds = newArray;
            try {
                clientConfig.save();
            } catch (IOException e) {
                e.printStackTrace();
            }
        }
    }

    public void saveServers() {
        ArrayList<String> saveTheseServers = new ArrayList<>(servers.size());
        for (Server server : servers.values()) {
            try {
                server.save();
                saveTheseServers.add(server.serverId.toString());
            } catch (Exception e) {
                e.printStackTrace();
            }
        }

        clientConfig.savedServerIds = saveTheseServers.toArray(new String[saveTheseServers.size()]);
        try {
            clientConfig.save();
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    public void processNotification(NeptuneNotification notification) {
        for (Server server : servers.values()) {
            server.sendNotification(notification);
        }
    }

}
