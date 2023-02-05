package com.neptune.app;

//Create a method that searches the ServerManager's Map of servers and compare the serverId with the textView that we wanna delete.
//Use either list views to make a lists of the names and edit buttons, or create a new TextView and ImageView for each new device. Depending on what you choose
// you will have to delete the entries from the list or the entire views when removing a device.

import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.fragment.app.DialogFragment;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.content.DialogInterface;
import android.net.wifi.WifiManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Looper;
import android.text.format.Formatter;
import android.view.View;
import android.view.textclassifier.ConversationActions;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.content.Intent;

import com.google.gson.JsonParseException;
import com.neptune.app.Backend.ClientConfig;
import com.neptune.app.Backend.ConfigurationManager;
import com.neptune.app.Backend.ConnectionManager;
import com.neptune.app.Backend.IPAddress;
import com.neptune.app.Backend.NotificationListenerService;
import com.neptune.app.Backend.Server;
import com.neptune.app.Backend.ServerManager;

import org.json.JSONException;

import java.io.IOException;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.util.UUID;

public class MainActivity extends AppCompatActivity implements RenameDialog.RenameDialogListener{
    public static ServerManager serverManager;
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
            lblMyIP.setVisibility(View.INVISIBLE);
        }

        TextView lblVersion = findViewById(R.id.lblVersion);
        lblVersion.setText("Version: " + BuildConfig.VERSION_NAME);

    }

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
                        String name = nameField.getText().toString();
                        String ipAddress = ipAddressField.getText().toString();
                        Thread thread = new Thread(() -> addServer(name, ipAddress));
                        thread.setName("ServerAdder-" + name);
                        thread.start();
                    }
                })
                .setNegativeButton("Cancel", new DialogInterface.OnClickListener() {
                    @Override
                    public void onClick(DialogInterface dialog, int which) {

                    }
                });

        addDialog = builder.create();
    }

    public void addNameLine(Server server) {
        if (server == null)
            return;

        final View view = getLayoutInflater().inflate(R.layout.name_line, null);

        devName = view.findViewById(R.id.name);
        editName = view.findViewById(R.id.editName);
        delete = view.findViewById(R.id.delete);

        devName.setText(server.friendlyName);
        devName.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                startActivity(new Intent(MainActivity.this, DeviceActivity.class));
            }
        });

        editName.setOnClickListener(new ImageView.OnClickListener(){
            @Override
            public void onClick(View v) {
                openDialog();
            }
        });

        delete.setOnClickListener(new ImageView.OnClickListener() {
            @Override
            public void onClick(View v) {
                try{
                    serverManager.removeServer(server);
                    addLine.removeView(view);
                } catch (Exception e) {
                    e.printStackTrace();
                    showErrorMessage("Failed to unpair server", e.getMessage());
                }
            }
        });

        addLine.addView(view);
    }

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

        } catch (ConnectionManager.FailedToPair e) {
            e.printStackTrace();
            if (server != null)
                server.delete();
            runOnUiThread(() -> showErrorMessage("Failed to pair device", e.getMessage()));
        }
    }
}