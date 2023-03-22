package com.neptune.app;

//Create a method that searches the ServerManager's Map of servers and compare the serverId with the textView that we wanna delete.
//Use either list views to make a lists of the names and edit buttons, or create a new TextView and ImageView for each new device. Depending on what you choose
// you will have to delete the entries from the list or the entire views when removing a device.

import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import androidx.fragment.app.DialogFragment;

import android.app.Activity;
import android.content.Context;
import android.content.DialogInterface;
import android.net.wifi.WifiManager;
import android.os.Bundle;
import android.text.format.Formatter;
import android.util.Log;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.content.Intent;

import com.google.gson.JsonParseException;
import com.neptune.app.Backend.ClientConfig;
import com.neptune.app.Backend.ConfigurationManager;
import com.neptune.app.Backend.Exceptions.FailedToPair;
import com.neptune.app.Backend.IPAddress;
import com.neptune.app.Backend.NeptuneKeepAlive;
import com.neptune.app.Backend.NotificationManager;
import com.neptune.app.Backend.Server;
import com.neptune.app.Backend.ServerManager;

import org.json.JSONException;

import java.io.IOException;
import java.util.HashMap;
import java.util.UUID;

public class MainActivity extends AppCompatActivity implements RenameDialog.RenameDialogListener{
    public static ServerManager serverManager;
    public static com.neptune.app.Backend.NotificationManager notificationManager;
    private ConfigurationManager configurationManager;

    public static ClientConfig ClientConfig;

    public static Context Context;


    //public Config config
    private TextView devName;
    private ImageView editName;
    private Button add;
    private AlertDialog addDialog;
    private LinearLayout addLine;
    //private Button notifListTest;
    private ImageView delete;
    private TextView ip;
    private HashMap<Server, View> serversShown = new HashMap<Server, View>();

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Context = getApplicationContext();

        setContentView(R.layout.activity_main);

        //devName = (TextView) findViewById(R.id.name);
        //editName = (ImageView) findViewById(R.id.editDevName);
        add = (Button) findViewById(R.id.addDev);
        addLine = findViewById(R.id.container);
        //notifListTest = findViewById(R.id.notifTest);
        buildAddDialog();

        // Get configurationManager
        configurationManager = new ConfigurationManager();
        try {
            ClientConfig = new ClientConfig("clientConfiguration.json", configurationManager);
            ClientConfig.save();
            notificationManager = new NotificationManager();
            serverManager = new ServerManager(ClientConfig, configurationManager);
            Server[] servers = serverManager.getServers();
            for (int i = 0; i<servers.length; i++) {
                addNameLine(servers[i]);
            }
            serverManager.connectToServers(); // Connects all servers up
        } catch (IOException | JSONException e) {
            e.printStackTrace();
            // Failed to load main config! First run I guess

            AlertDialog.Builder alertBuilder = new AlertDialog.Builder(this);
            alertBuilder.setTitle("Failed to load configuration/server manager");
            alertBuilder.setMessage("There was an unknown error loading the client configuration file or setting up the server manager.\n" +
                    "Please report this to the developer (hopefully not you)\n\n" +
                    "error.getMessage(): " + e.getMessage());
            alertBuilder.setPositiveButton("Ok", new DialogInterface.OnClickListener() {
                @Override
                public void onClick(DialogInterface dialog, int which) {
                    // Probably quit, or maybe recreate the config?
                }
            });

            alertBuilder.create().show();

        }



        /*devName.setOnClickListener(new TextView.OnClickListener(){
            @Override
            public void onClick(View v) {
                startActivity(new Intent(MainActivity.this, DeviceActivity.class));
            }
        });*/

        /*editName.setOnClickListener(new ImageView.OnClickListener(){
            @Override
            public void onClick(View v) {
                openDialog();
            }
        });*/

        add.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                addDialog.show();
            }
        });

        //Part of the Notification Button
        /*if(Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel("My notification", "My notification", NotificationManager.IMPORTANCE_DEFAULT);
            NotificationManager manager = getSystemService(NotificationManager.class);
            manager.createNotificationChannel(channel);
        }
        //Notification Button
        notifListTest.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                //startActivity(new Intent(MainActivity.this, NotificationListenerService.class));
                //new NotificationListenerService().onCreate();
                NotificationCompat.Builder buidler = new NotificationCompat.Builder(MainActivity.this, "My notification");
                buidler.setContentTitle("My title");
                buidler.setContentText("Content from Notification");
                buidler.setSmallIcon(R.drawable.ic_launcher_background);
                buidler.setAutoCancel(true);

                NotificationManagerCompat notificationManagerCompat = NotificationManagerCompat.from(MainActivity.this);
                notificationManagerCompat.notify(1,buidler.build());

            }
        });*/

        TextView lblFriendlyName = findViewById(R.id.lblMyFriendlyName);
        lblFriendlyName.setText(ClientConfig.friendlyName);

        TextView lblMyIP = findViewById(R.id.lblMyIP);
        try {
            WifiManager wm = (WifiManager) getApplicationContext().getSystemService(Context.WIFI_SERVICE);
            String ip = Formatter.formatIpAddress(wm.getConnectionInfo().getIpAddress());
            lblMyIP.setText("Device IP: " + ip);
        } catch (Exception err) {
            err.printStackTrace();
            //lblMyIP.setVisibility(View.INVISIBLE);
        }

        TextView lblVersion = findViewById(R.id.lblVersion);
        lblVersion.setText("Version: " + BuildConfig.VERSION_NAME);

        startService(new Intent(this, NeptuneKeepAlive.class));

    }

    //This method builds the add dialog so that when a user wants to add a server, it is able to be used.
    private void buildAddDialog() {
        AlertDialog.Builder builder = new AlertDialog.Builder(this);
        View view = getLayoutInflater().inflate(R.layout.add_dialog, null);

        final EditText nameField = view.findViewById(R.id.nameEdit);
        final EditText ipAddressField = view.findViewById(R.id.ipEdit);

        builder.setView(view);
        builder.setTitle("Enter name")
                .setPositiveButton("OK", new DialogInterface.OnClickListener() {
                    @Override
                    public void onClick(DialogInterface dialog, int which) {
                        try {
                            String name = nameField.getText().toString();
                            String ipAddress = ipAddressField.getText().toString();
                            Thread thread = new Thread(() -> addServer(name, ipAddress));
                            thread.setName("ServerAdder-" + name);
                            thread.start();
                        } catch (Exception e) {
                            e.printStackTrace();
                            showErrorMessage("Unable to add server", "Error encountered pairing with new server: " + e.getMessage());
                        }
                    }
                })
                .setNegativeButton("Cancel", new DialogInterface.OnClickListener() {
                    @Override
                    public void onClick(DialogInterface dialog, int which) {

                    }
                });

        addDialog = builder.create();
    }

    /*This method adds an item to the list of servers and makes it appear on the screen for the user to interact with. It sets the name and ip based on user input.
     *It also has the onClickListeners for one of the delete buttons for a server and the edit name button. If the device name is clicked, the user is sent to another
     * activity filled with settings about the specific server.
    */
    public void addNameLine(Server server) {
        if (server == null)
            return;

        final View view = getLayoutInflater().inflate(R.layout.name_line, null);

        devName = view.findViewById(R.id.name);
        editName = view.findViewById(R.id.editName);
        delete = view.findViewById(R.id.delete);
        ip = findViewById(R.id.lblMyIP);
        ip.setText(server.ipAddress.getIPAddress());
        //ip.setVisibility(View.VISIBLE);

        devName.setText(server.friendlyName);
        devName.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                Intent deviceActivity = new Intent(MainActivity.this, DeviceActivity.class);
                String id = server.serverId.toString();
                String friendlyName = server.friendlyName;
                deviceActivity.putExtra("ID", id);
                deviceActivity.putExtra("FRIENDLY_NAME", friendlyName);
                startActivityForResult(deviceActivity, R.integer.LAUNCH_DEVICE_ACTIVITY);
                //Will update above method, this was easier to understand/use for the time being.
                //startActivity(deviceActivity);
            }
        });

        editName.setOnClickListener(new ImageView.OnClickListener(){
            @Override
            public void onClick(View v) {
                new Thread(() -> {
                    try {
                        Log.i("MainActivity", "Syncing with " + server.friendlyName);
                        server.setupConnectionManager();
                        if (!server.getConnectionManager().isWebSocketConnected())
                            server.getConnectionManager().createWebSocketClient(false);
                        server.syncConfiguration();
                        server.ping();
                        server.sendBatteryInfo();
                    } catch (Exception e) {
                        e.printStackTrace();
                    }
                }).start();
                //openDialog();
            }
        });

        //Deletes the selected server upon clicking the related ImageView.
        delete.setOnClickListener(new ImageView.OnClickListener() {
            @Override
            public void onClick(View v) {
                try{
                    removeServer(server, view);
                } catch (Exception e) {
                    e.printStackTrace();
                    showErrorMessage("Failed to unpair server", e.getMessage());
                }
            }
        });

        addLine.addView(view);
        serversShown.put(server, view);
    }

    //Method to open the dialog box for renaming a server. May want to change name to openRenameDialog, or change the tag to a String variable with the name.
    public void openDialog(){
        RenameDialog de = new RenameDialog();
        de.show(getSupportFragmentManager(), "rename dialog");
    }

    @Override
    public void applyTexts(String n){
        devName.setText(n);
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
    }

    public void onDialogPositiveClick(DialogFragment rename) {

    }

    public void onDialogNegativeClick(DialogFragment rename) {

    }

    @Override
    protected void onPause() {
        super.onPause();
    }

    @Override
    protected void onRestoreInstanceState(Bundle bundle) {
        super.onRestoreInstanceState(bundle);
    }

    @Override
    protected void onResume() {
        super.onResume();
    }

    @Override
    protected void onSaveInstanceState(Bundle bundle) {
        super.onSaveInstanceState(bundle);
    }

    public void showRenameDialog() {

    }

    @Override
    protected void onStop() {
        super.onStop();
    }

    /*When a different activity returns to MainActivity, with something for it, whether that be an action or information, this method will handle it, depending
    * on what activity is sending the information. It'll handle the information in a certain way depending on what information is returned.
    */
    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);

        /*A switch case here is used to check the differences between what the requestCode was. Different activities, or the same ones, can be launched for different
        * reasons, or no reason at all. Each case will handle a different reason for opening the activity. Within each case, if the reasons can't be initially
        * differentiated, there is additional expressions to ensure the correct response code is ran.
        */
        switch(requestCode) {
            case(R.integer.LAUNCH_DEVICE_ACTIVITY) : {
                if(resultCode == Activity.RESULT_OK) {
                    Server s = serverManager.getServer(UUID.fromString(data.getStringExtra("DELETE_ID")));
                    s.unpair();
                    removeServer(s, serversShown.get(s));
                }
                break;
            }
        }
    }


    public void showErrorMessage(String title, String message) {
        AlertDialog.Builder alertBuilder = new AlertDialog.Builder(this);
        alertBuilder.setTitle(title);
        alertBuilder.setMessage(message);
        alertBuilder.setPositiveButton("Ok", (dialog, which) -> {
            // do stuff here?
        });

        alertBuilder.create().show();
    }

    private void addServer(String name, String ipAddr) {
        Server server = null;
        try {
            // Later we need to get the UUID from the server via a HTTP request or something..
            // Or at the very least rename the config file to the real UUID
            server = new Server(UUID.randomUUID(), configurationManager);
            server.ipAddress = new IPAddress(ipAddr, 25560);
            server.friendlyName = name;
            server.save();
            server.setupConnectionManager();
            serverManager.addServer(server);
            serverManager.saveServers();

            Server finalServer = server;
            runOnUiThread(() -> addNameLine(finalServer));
        } catch (JsonParseException e) {
            e.printStackTrace();
            if (server != null)
                server.delete();
            runOnUiThread(() -> showErrorMessage("Failed to pair device", e.getMessage()));

        } catch (IOException e) {
            e.printStackTrace();
            if (server != null)
                server.delete();
            runOnUiThread(() -> showErrorMessage("Failed to pair device", e.getMessage()));

        } catch (FailedToPair e) {
            e.printStackTrace();
            if (server != null)
                server.delete();
            runOnUiThread(() -> showErrorMessage("Failed to pair device", e.getMessage()));
        }
    }

    //Removes the selected server from the ListView of servers on the MainActivity screen and from the list of all servers.
    public void removeServer(Server s, View v) {
        serverManager.removeServer(s);
        addLine.removeView(serversShown.get(s));
        serversShown.remove(s);
    }
}