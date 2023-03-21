package com.neptune.app;//comment

import androidx.appcompat.app.ActionBar;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import androidx.fragment.app.DialogFragment;

import android.app.Activity;
import android.os.Bundle;
import android.util.Log;
import android.widget.Button;
import android.widget.CheckBox;
import android.widget.EditText;
import android.widget.ImageView;
import android.widget.RadioButton;
import android.widget.TextView;
import android.content.Intent;
import android.view.View;

import com.google.gson.JsonParseException;
import com.neptune.app.Backend.ConnectionManager;
import com.neptune.app.Backend.Server;

import java.io.IOException;
import java.util.UUID;


public class DeviceActivity extends AppCompatActivity {
    //public Button connect;
    //public Button temp;
    public ConnectionManager cm;
    private Button delete;
    private Button btnSave;
    private EditText ipAddress;
    private TextView notificationsTextView;
    private TextView clipboardTextView;
    private TextView fileTextView;
    private CheckBox notificationsCheckbox;


    private boolean currentlySyncing = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_device);

        ActionBar aBar = getSupportActionBar();
        if(aBar!=null) {
            aBar.setDisplayHomeAsUpEnabled(true);
        }

        //Grabs the server ID passed on from MainActivity so that it can be used in DeviceActivity and passed on to other activities.
        String serverId = getIntent().getStringExtra("ID");
        Server server = MainActivity.serverManager.getServer(UUID.fromString(serverId));

        //Setting various TextViews based on the friendly name of the device connected.
        String serverFriendlyName = getIntent().getStringExtra("FRIENDLY_NAME");
        notificationsTextView = findViewById(R.id.notificationsTextView);
        notificationsTextView.setText("Send notifications to " + server.friendlyName + ".");

        clipboardTextView = findViewById(R.id.clipboardTextView);
        clipboardTextView.setText("Allow " + server.friendlyName + " to read and write clipboard data.");

        fileTextView = findViewById(R.id.fileTextView);
        fileTextView.setText("Allow " + server.friendlyName + " to send files.");

        notificationsCheckbox = findViewById(R.id.notificationsCheckbox);
        notificationsCheckbox.setChecked(server.syncNotifications);

        //CheckBox chkSyncNotifications = findViewById(R.id.notificationsCheckbox);
        CheckBox chkClipboardSharing = findViewById(R.id.chkClipboardSharingEnabled);
        chkClipboardSharing.setChecked(server.clipboardSettings.enabled == true);
        CheckBox chkFileSharingEnabled = findViewById(R.id.chkFileSharingEnabled);
        chkFileSharingEnabled.setChecked(server.fileSharingEnabled == true);

        View.OnClickListener checkBoxListener = new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                server.syncNotifications = notificationsCheckbox.isChecked();
                server.clipboardSettings.enabled = chkClipboardSharing.isChecked();
                server.fileSharingEnabled = chkFileSharingEnabled.isChecked();
            }
        };

        notificationsCheckbox.setOnClickListener(checkBoxListener);
        chkClipboardSharing.setOnClickListener(checkBoxListener);
        chkFileSharingEnabled.setOnClickListener(checkBoxListener);

        //Sets the EditText containing the IP address of the server to the correct IP Address.
        ipAddress = findViewById(R.id.editIPAddress);
        ipAddress.setText(server.ipAddress.getIPAddress());

        ImageView notifs = (ImageView) findViewById(R.id.notifSets);
        notifs.setOnClickListener(new View.OnClickListener(){
            public void onClick(View v) {
                Intent notificationsActivity = new Intent(DeviceActivity.this, NotificationsActivity.class);
                notificationsActivity.putExtra("ID2", serverId);
                startActivity(notificationsActivity);
            }
        });

        ImageView files = (ImageView) findViewById(R.id.fileSets);
        files.setOnClickListener(new View.OnClickListener(){
            public void onClick(View v) {
                startActivity(new Intent(DeviceActivity.this, FileActivity.class));
            }
        });

        /*The delete button on the screen associated with DeviceActivity calls the delete button on the MainActivity screen so that the server is deleted.
        * Need to determine if this works, and send the user back to the home screen.
        */
        delete = findViewById(R.id.deleteDeviceActivity);
        delete.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                Intent intent = new Intent();
                intent.putExtra("DELETE_ID", serverId);
                setResult(Activity.RESULT_OK, intent);
                finish();
            }
        });


        btnSave = findViewById(R.id.btnSave);
        btnSave.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                try {
                    server.save();
                    if (!currentlySyncing) {
                        currentlySyncing = true;
                        new Thread(() -> {
                            try {
                                Log.i("DeviceActivity", "Syncing config " + server.friendlyName);
                                server.syncConfiguration();
                                currentlySyncing = false;
                            } catch (Exception e) {
                                e.printStackTrace();
                            }
                        }).start();
                    }

                } catch (Exception e) {
                    showErrorMessage("Failed to save settings.", "An error occurred while saving the settings: " + e.getMessage());
                }
            }
        });

        /*connect = (Button) findViewById(R.id.connec);
        connect.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                cm.initiateConnection();
            }
        });

        temp = (Button) findViewById(R.id.tba);
        temp.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {

            }
        });*/
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
    protected void onResume() {
        super.onResume();
    }

    @Override
    protected void onSaveInstanceState(Bundle bundle) {
        super.onSaveInstanceState(bundle);
    }

    public void showDeleteDialog() {

    }

    @Override
    protected void onStop() {
        super.onStop();
    }

    @Override
    public boolean onSupportNavigateUp() {
        onBackPressed();
        return true;
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
}
