package com.neptune.app;

import android.content.Context;
import android.content.DialogInterface;
import android.net.nsd.NsdManager;
import android.os.Bundle;
import android.text.InputFilter;
import android.util.Log;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ImageButton;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;

import com.neptune.app.Backend.Exceptions.InvalidIPAddress;
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
    private ProgressBar searchingProgressBar;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_add_device);

        serverList = findViewById(R.id.container);
        searchingProgressBar = findViewById(R.id.searching_progress_bar);

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


        InputFilter[] filters = new InputFilter[1];
        filters[0] = new InputFilter() {
            @Override
            public CharSequence filter(CharSequence source, int start, int end,
                                       android.text.Spanned dest, int dstart, int dend) {
                if (end > start) {
                    String destTxt = dest.toString();
                    String resultingTxt = destTxt.substring(0, dstart)
                            + source.subSequence(start, end)
                            + destTxt.substring(dend);
                    if (!resultingTxt
                            .matches("^\\d{1,3}(\\.(\\d{1,3}(\\.(\\d{1,3}(\\.(\\d{1,3})?)?)?)?)?)?")) {
                        return "";
                    } else {
                        String[] splits = resultingTxt.split("\\.");
                        for (int i = 0; i < splits.length; i++) {
                            if (Integer.valueOf(splits[i]) > 255) {
                                return "";
                            }
                        }
                    }
                }
                return null;
            }

        };
        ipAddressField.setFilters(filters);


        builder.setView(view);
        builder.setTitle("Enter name")
                .setPositiveButton("OK", (dialog, which) -> {
                    try {
                        String name = nameField.getText().toString();
                        String ipAddress = ipAddressField.getText().toString();
                        nameField.setText("");
                        ipAddressField.setText("");

                        Thread thread = new Thread(() -> {
                            try {
                                MDNSResolver.NeptuneService service = new MDNSResolver.NeptuneService();
                                service.friendlyName = name;
                                service.ipAddress = new IPAddress(ipAddress, 25560);
                                service.serverId = UUID.randomUUID().toString();
                                addServer(service);
                            } catch (InvalidIPAddress ignored) {
                                runOnUiThread( () ->
                                        showErrorMessage("Invalid IP address", "Unable to add server, invalid IP address. Make sure to enter a valid IPv4 address.")
                                );
                            } catch (Exception e) {
                                runOnUiThread( () ->
                                        showErrorMessage("Unable to add server", "Error encountered pairing with new server: " + e.getMessage())
                                );
                            }
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
        try {
            AlertDialog.Builder alertBuilder = new AlertDialog.Builder(this);
            alertBuilder.setTitle(title);
            alertBuilder.setMessage(message);
            alertBuilder.setPositiveButton("Ok", okayListener);
            alertBuilder.create().show();
        } catch (Exception ignored) {
            try {
                Toast.makeText(this, message, Toast.LENGTH_LONG).show();
            } catch (Exception ignored_2) {}
        }
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

        View view = getLayoutInflater().inflate(R.layout.server_add_item_line, null);

        //public Config config
        TextView serverName = view.findViewById(R.id.server_name);
        TextView serverInfoTag = view.findViewById(R.id.server_info_tag);

        ImageButton serverSyncButton = view.findViewById(R.id.server_item_sync);
        ImageButton serverSyncIssueButton = view.findViewById(R.id.server_item_sync_issue);
        ProgressBar serverSyncProgress = view.findViewById(R.id.server_item_sync_progress);

        serverName.setText(server.friendlyName);

        String infoTag;
        infoTag = getString(R.string.server_add_item_info_tag_ip, server.ipAddress.toString()) + ", "
                + getString(R.string.server_add_item_info_tag_version, server.version.toString());
        serverInfoTag.setText(infoTag);

        DialogInterface.OnClickListener confirmationListener = (dialog, which) -> {
            dialog.dismiss();
            new Thread(() -> {
                // Add server
                runOnUiThread(() -> {
                    hideOrShowImageButtonProgressBar(serverSyncButton, serverSyncProgress, false);
                    serverSyncIssueButton.setVisibility(View.GONE);
                });
                Log.i("AddDeviceActivity", "Adding  " + server.friendlyName);
                boolean added = addServer(server);

                if (added) {
                    runOnUiThread(() -> showErrorMessage("Server added", server.friendlyName + " has successfully been paired."));
                    removeServer(server.serverId); // We added it, remove it!
                } else {
                    runOnUiThread(() -> {
                        hideOrShowImageButtonProgressBar(serverSyncIssueButton, serverSyncProgress, true);
                        serverSyncButton.setVisibility(View.GONE);
                    });
                }
            }).start();
        };

        View.OnClickListener syncButtonListener = v -> new Thread(() -> {
            try {
                runOnUiThread(() -> {
                    AlertDialog.Builder builder = new AlertDialog.Builder(AddDeviceActivity.this);
                    builder.setTitle("Pair Device")
                            .setMessage("Are you sure you want to pair with " + server.friendlyName + "?")
                            .setPositiveButton("Pair", confirmationListener)
                            .setNegativeButton("Cancel", (dialog, which) -> {
                                // Do nothing, just close the dialog
                                dialog.dismiss();
                            });
                    AlertDialog pairConfirmation = builder.create();
                    pairConfirmation.show();
                });

            } catch (Exception e) {
                runOnUiThread(() -> {
                    hideOrShowImageButtonProgressBar(serverSyncIssueButton, serverSyncProgress, true);
                    serverSyncButton.setVisibility(View.GONE);
                });
                e.printStackTrace();
            }
        }).start();

        serverSyncButton.setOnClickListener(syncButtonListener);
        serverSyncIssueButton.setOnClickListener(syncButtonListener);
        serverName.setOnClickListener(syncButtonListener);
        serverInfoTag.setOnClickListener(syncButtonListener);


        runOnUiThread(() -> serverList.addView(view));
        serversShown.put(server.serverId, view);
        runOnUiThread(() -> searchingProgressBar.setVisibility(View.GONE));
    }

    public void removeServer(String id) {
        try {
            if (serversShown.containsKey(id)) {
                View view = serversShown.get(id);
                runOnUiThread(() -> serverList.removeView(view));
                serversShown.remove(id);

                if (serversShown.size() <= 0) {
                    runOnUiThread(() -> searchingProgressBar.setVisibility(View.VISIBLE));
                }
            }
        } catch (Exception ignored) {}
    }
}