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
import android.content.DialogInterface;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.content.Intent;

import com.neptune.app.Backend.NotificationListenerService;
import com.neptune.app.Backend.Server;
import com.neptune.app.Backend.ServerManager;

public class MainActivity extends AppCompatActivity implements RenameDialog.RenameDialogListener{
    public ServerManager serverManager = new ServerManager();
    public Server server;
    //public Config config
    private TextView devName;
    private ImageView editName;
    private Button add;
    private AlertDialog addDialog;
    private LinearLayout addLine;
    private Button notifListTest;
    private ImageView delete;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        devName = (TextView) findViewById(R.id.name);
        editName = (ImageView) findViewById(R.id.editDevName);
        add = (Button) findViewById(R.id.addDev);
        addLine = findViewById(R.id.container);
        notifListTest = findViewById(R.id.notifTest);
        buildAddDialog();

        devName.setOnClickListener(new TextView.OnClickListener(){
            @Override
            public void onClick(View v) {
                startActivity(new Intent(MainActivity.this, DeviceActivity.class));
            }
        });

        editName.setOnClickListener(new ImageView.OnClickListener(){
            @Override
            public void onClick(View v) {
                openDialog();
            }
        });

        add.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                addDialog.show();
            }
        });

        //Part of the Notification Button
        if(Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
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
        });
    }

    private void buildAddDialog() {
        AlertDialog.Builder builder = new AlertDialog.Builder(this);
        View view = getLayoutInflater().inflate(R.layout.add_dialog, null);

        final EditText name = view.findViewById(R.id.nameEdit);

        builder.setView(view);
        builder.setTitle("Enter name")
                .setPositiveButton("OK", new DialogInterface.OnClickListener() {
                    @Override
                    public void onClick(DialogInterface dialog, int which) {
                        addNameLine(name.getText().toString());
                        server = new Server();
                        server.setFriendlyName(name.getText().toString());
                        serverManager.addServer(server);
                        //Maybe set IP address here, this would need to be grabbed from the server when the connection is made so probably just calling something like
                        //server.setIPAddress(something); Maybe the setIPAddress should have no params, or its param is getIPAddress and that gets the IP somehow
                        //It's that or getting+setting the IP directly here, but feels more like a backend thing.
                        server.pair();
                    }
                })
                .setNegativeButton("Cancel", new DialogInterface.OnClickListener() {
                    @Override
                    public void onClick(DialogInterface dialog, int which) {

                    }
                });

        addDialog = builder.create();
    }

    public void addNameLine(String name) {
        final View view = getLayoutInflater().inflate(R.layout.name_line, null);

        devName = view.findViewById(R.id.name);
        editName = view.findViewById(R.id.editName);
        delete = view.findViewById(R.id.delete);

        devName.setText(name);
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
                server = serverManager.getServer(devName.getText().toString());
                serverManager.removeServer(server);
                server.unpair();
                addLine.removeView(view);
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
}