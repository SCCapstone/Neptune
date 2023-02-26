package com.neptune.app.Backend;

import android.util.Log;

import com.neptune.app.MainActivity;

import java.io.File;
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
        s.unpair();
        saveServers();
    }

    public void addServer(Server s) {
        servers.put(s.serverId, s);
        saveServers();
    }


    public void pair(UUID serverId, IPAddress ipAddress) throws ConnectionManager.FailedToPair {
        Server server = servers.get(serverId);
        server.ipAddress = ipAddress;
        server.pair();
    }

    public void unpair(UUID server) {
        servers.get(server).unpair();
    }

    public Server getServer(UUID serverId) {
        return servers.get(serverId);
    }

    public Server[] getServers() {
        Server[] servers = new Server[this.servers.size()];
        int i = 0;
        for (UUID serverId : this.servers.keySet()) {
            servers[i] = this.servers.get(serverId);
            i++;
        }
        return servers;
    }

    public void loadServers() {
        servers = new HashMap<UUID, Server>();

        ArrayList<String> removeTheseIds = new ArrayList<>();

        Log.i("ServerManager", "loadServers: loading servers");

        for (String serverId : clientConfig.savedServerIds) {
            try {
                File fileObject = new File(MainActivity.Context.getFilesDir(), "server_" + serverId + ".json");
                if (fileObject.exists()) {
                    Server server = new Server(serverId, configurationManager);
                    servers.put(UUID.fromString(serverId), server);
                } else {
                    Log.e("ServerManager", "loadServers: failed to load server " + serverId + " as the server config file does not exist.");
                    removeTheseIds.add(serverId);
                }
            } catch (IOException e) {
                // Remove ID
                Log.e("ServerManager", "loadServers: failed to load server: " + serverId, e);
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

    public void connectToServers() {
        Thread connectThread = new Thread(() -> {
                Server[] servers = this.getServers();
                for (Server server : servers) {
                    try {
                        Log.i("ServerManager", "connectToServer: setting up server " + server.serverId);
                        server.setupConnectionManager();
                    } catch (ConnectionManager.FailedToPair e) {
                        Log.e("ServerManager", "connectToServer: " + server.serverId + " failed to pair?", e);
                    }
                }
        });
        connectThread.setName("ServerManager-ConnectToServers");
        connectThread.start();
    }

    /**
     * Save all the server configs, add saved servers to the client config list of savedServerIds
     */
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


    public void processNotification(NeptuneNotification notification, Server.SendNotificationAction action) {
        for (Server server : servers.values()) {
            server.sendNotification(notification, action);
        }
    }

    public void processNotification(NeptuneNotification notification) {
        for (Server server : servers.values()) {
            server.sendNotification(notification);
        }
    }

}
