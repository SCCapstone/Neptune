package com.neptune.app;

import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;

import android.app.Dialog;
import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.net.nsd.NsdManager;
import android.net.nsd.NsdServiceInfo;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ImageButton;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import com.neptune.app.Backend.Exceptions.InvalidIPAddress;
import com.neptune.app.Backend.Exceptions.TooManyEventListenersException;
import com.neptune.app.Backend.Exceptions.TooManyEventsException;
import com.neptune.app.Backend.IPAddress;
import com.neptune.app.Backend.MDNSDiscoveryListener;
import com.neptune.app.Backend.MDNSResolver;
import com.neptune.app.Backend.Server;

import java.util.HashMap;
import java.util.UUID;

public class AddDeviceActivity extends AppCompatActivity {
    private MDNSDiscoveryListener mdnsDiscoveryListener;
    private NsdManager mNsdManager;

    private LinearLayout serverList;
    private final HashMap<String, View> serversShown = new HashMap<>();

    private AlertDialog addDialog;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_add_device);

        serverList = findViewById(R.id.container);

        Button addViaIp = findViewById(R.id.add_server_by_ip);
        addViaIp.setOnClickListener(view -> addDialog.show());

        // Listen for server MDNS advertisements
        // Instantiate NsdManager
        mNsdManager = (NsdManager) getSystemService(Context.NSD_SERVICE);

        // Instantiate resolve listener
        MDNSResolver resolveListener = new MDNSResolver();

        // Instantiate and initialize discovery listener
        mdnsDiscoveryListener = new MDNSDiscoveryListener(this, resolveListener);

        // Start service discovery
        mNsdManager.discoverServices("_neptune._tcp", NsdManager.PROTOCOL_DNS_SD, mdnsDiscoveryListener);

        try {
            resolveListener.EventEmitter.on("discovered", (object) -> {
                if (object.length == 1 && object[0] instanceof MDNSResolver.NeptuneService) {
                    MDNSResolver.NeptuneService service = (MDNSResolver.NeptuneService) object[0];
                    Log.d("AddDeviceActivity", "Found server: " + service.serverId);
                    addServerToList(service);
                }
            });
        } catch (Exception e) {
            e.printStackTrace();
        }

        try {
            mdnsDiscoveryListener.EventEmitter.on("lost", (object) -> {
                if (object.length == 1 && object[0] instanceof String) {
                    String serverId = (String) object[0];
                    Log.d("AddDeviceActivity", "Lost server: " + serverId);
                    if (serversShown.containsKey(serverId)) {
                        removeServer(serverId);
                    }
                }
            });
        } catch (Exception e) {
            e.printStackTrace();
        }

        buildAddDialog();
    }

    @Override
    protected void onDestroy() {
        // Stop service discovery
        mNsdManager.stopServiceDiscovery(mdnsDiscoveryListener);

        super.onDestroy();
    }

    /**
     * This method builds the add dialog so that when a user wants to add a server, it is able to be used.
     */
    private void buildAddDialog() {
        AlertDialog.Builder builder = new AlertDialog.Builder(this);
        View view = getLayoutInflater().inflate(R.layout.add_dialog, null);

        final EditText nameField = view.findViewById(R.id.nameEdit);
        final EditText ipAddressField = view.findViewById(R.id.ipEdit);

        builder.setView(view);
        builder.setTitle("Enter name")
                .setPositiveButton("OK", (dialog, which) -> {
                    try {
                        String name = nameField.getText().toString();
                        String ipAddress = ipAddressField.getText().toString();
                        nameField.setText("");
                        ipAddressField.setText("");

                        Thread thread = new Thread(() -> {
                            MDNSResolver.NeptuneService service = new MDNSResolver.NeptuneService();
                            service.friendlyName = name;
                            service.ipAddress = new IPAddress(ipAddress, 25560);
                            service.serverId = UUID.randomUUID().toString();
                            addServer(service);
                        });
                        thread.setName("ServerAdder-" + name);
                        thread.start();
                    } catch (Exception e) {
                        e.printStackTrace();
                        showErrorMessage("Unable to add server", "Error encountered pairing with new server: " + e.getMessage());
                    }
                })
                .setNegativeButton("Cancel", (dialog, which) -> {

                });

        addDialog = builder.create();
    }

    public void showErrorMessage(String title, String message, DialogInterface.OnClickListener okayListener) {
        AlertDialog.Builder alertBuilder = new AlertDialog.Builder(this);
        alertBuilder.setTitle(title);
        alertBuilder.setMessage(message);
        alertBuilder.setPositiveButton("Ok", okayListener);
        alertBuilder.create().show();
    }
    public void showErrorMessage(String title, String message) {
        showErrorMessage(title, message, (dialog, which) -> {
            // do stuff here?
        });
    }

    private boolean addServer(MDNSResolver.NeptuneService service) {
        Server server = null;
        try {
            // Later we need to get the UUID from the server via a HTTP request or something..
            // Or at the very least rename the config file to the real UUID
            server = new Server(service.serverId, MainActivity.configurationManager);
            server.ipAddress = service.ipAddress;
            server.friendlyName = service.friendlyName;
            server.save();
            server.setupConnectionManager();
            MainActivity.serverManager.addServer(server);
            MainActivity.serverManager.saveServers();
            return true;
        } catch (InvalidIPAddress e) {
            if (server != null)
                server.delete();
            runOnUiThread(() -> showErrorMessage("Invalid IP address", "You entered an invalid IP address."));
            return false;
        } catch (Exception e) {
            e.printStackTrace();
            if (server != null)
                server.delete();
            runOnUiThread(() -> showErrorMessage("Failed to pair device", e.getMessage()));
            return false;
        }
    }



    /**
     * The server line has ImageButtons and ProgressBars for the sync/delete section. This allows a quick and easy way to set which is visible.
     * @param button The button
     * @param progressBar The progress bar
     * @param showButton If the button is visible and the progress is not, or vice-versa
     */
    private void hideOrShowImageButtonProgressBar(ImageButton button, ProgressBar progressBar, boolean showButton) {
        runOnUiThread(() -> {
            button.setVisibility(showButton ? View.VISIBLE : View.GONE);
            progressBar.setVisibility(!showButton ? View.VISIBLE : View.GONE);
        });
    }


    public void addServerToList(MDNSResolver.NeptuneService server) {
        if (server == null)
            return;

        if (serversShown.containsKey(server.serverId) || MainActivity.serverManager.getServer(UUID.fromString(server.serverId)) != null) {
            return; // already shown / added
        }

        final View view = getLayoutInflater().inflate(R.layout.server_add_item_line, null);

        //public Config config
        TextView serverName = view.findViewById(R.id.server_name);
        ImageButton serverSyncButton = view.findViewById(R.id.server_item_sync);
        ImageButton serverSyncIssueButton = view.findViewById(R.id.server_item_sync_issue);
        ProgressBar serverSyncProgress = view.findViewById(R.id.server_item_sync_progress);

        serverName.setText(server.friendlyName);

        DialogInterface.OnClickListener confirmationListener = (dialog, which) -> new Thread(() -> {
            // Add server
            hideOrShowImageButtonProgressBar(serverSyncButton, serverSyncProgress, false);
            serverSyncIssueButton.setVisibility(View.GONE);
            Log.i("AddDeviceActivity", "Adding  " + server.friendlyName);
            boolean added = addServer(server);

            if (added) {
                showErrorMessage("Server added", server.friendlyName + " has successfully been paired.");
                removeServer(server.serverId); // We added it, remove it!
            } else {
                hideOrShowImageButtonProgressBar(serverSyncIssueButton, serverSyncProgress, true);
                serverSyncButton.setVisibility(View.GONE);
            }
        });

        View.OnClickListener syncButtonListener = v -> new Thread(() -> {
            try {
                runOnUiThread(() -> {
                    AlertDialog.Builder builder = new AlertDialog.Builder(AddDeviceActivity.this);
                    builder.setTitle("Pair Device")
                            .setMessage("Are you sure you want to pair with " + server.friendlyName + "?")
                            .setPositiveButton("Pair", (dialog, which) -> {
                                dialog.dismiss();
                                confirmationListener.onClick(dialog, which);
                            })
                            .setNegativeButton("Cancel", (dialog, which) -> {
                                // Do nothing, just close the dialog
                                dialog.dismiss();
                            });
                    AlertDialog pairConfirmation = builder.create();
                    pairConfirmation.show();
                });

            } catch (Exception e) {
                hideOrShowImageButtonProgressBar(serverSyncIssueButton, serverSyncProgress, true);
                runOnUiThread(() -> serverSyncProgress.setVisibility(View.GONE));
                e.printStackTrace();
            }
        }).start();

        serverSyncButton.setOnClickListener(syncButtonListener);
        serverSyncIssueButton.setOnClickListener(syncButtonListener);
        serverName.setOnClickListener(syncButtonListener);


        runOnUiThread(() -> serverList.addView(view));
        serversShown.put(server.serverId, view);
    }

    public void removeServer(String id) {
        try {
            if (serversShown.containsKey(id)) {
                View view = serversShown.get(id);
                runOnUiThread(() -> serverList.removeView(view));
                serversShown.remove(id);
            }
        } catch (Exception ignored) {}
    }
}