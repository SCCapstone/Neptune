package com.neptune.app;//comment

import androidx.appcompat.app.ActionBar;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import androidx.fragment.app.DialogFragment;

import android.annotation.TargetApi;
import android.app.Activity;
import android.content.ContentResolver;
import android.content.Context;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.DocumentsContract;
import android.provider.MediaStore;
import android.util.Log;
import android.widget.Button;
import android.widget.CheckBox;
import android.widget.CompoundButton;
import android.widget.EditText;
import android.widget.ImageView;
import android.widget.RadioButton;
import android.widget.TextView;
import android.content.Intent;
import android.view.View;
import android.widget.Toast;

import com.google.gson.JsonParseException;
import com.neptune.app.Backend.ConnectionManager;
import com.neptune.app.Backend.Server;

import java.io.FileNotFoundException;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;


public class DeviceActivity extends AppCompatActivity {
    public ConnectionManager cm;
    private Button delete;
    private Button btnSave;
    private EditText ipAddress;
    private TextView notificationsTextView;
    private TextView clipboardTextView;
    private TextView fileTextView;
    private CheckBox notificationsCheckBox;
    private CheckBox clipboardCheckBox;
    private CheckBox fileCheckBox;
    private Button sendFile;
    private Button sendClipboard;
    private Button receiveClipboard;
    private Server server;


    private boolean currentlySyncing = false;
    private int requestCodeMultiple = R.integer.LAUNCH_FILE_PICKER;

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
        server = MainActivity.serverManager.getServer(UUID.fromString(serverId));

        //Setting various TextViews based on the friendly name of the device connected.
        String serverFriendlyName = getIntent().getStringExtra("FRIENDLY_NAME");
        notificationsTextView = findViewById(R.id.notificationsTextView);
        notificationsTextView.setText("Send notifications to " + server.friendlyName + ".");

        clipboardTextView = findViewById(R.id.clipboardTextView);
        clipboardTextView.setText("Allow " + server.friendlyName + " to send and receive clipboard data.");

        fileTextView = findViewById(R.id.fileTextView);
        fileTextView.setText("Allow " + server.friendlyName + " to receive files.");

        notificationsCheckBox = findViewById(R.id.notificationsCheckbox);
        notificationsCheckBox.setChecked(server.syncNotifications);

        /*CheckBox chkSyncNotifications = findViewById(R.id.notificationsCheckbox);
        CheckBox chkClipboardSharing = findViewById(R.id.chkClipboardSharingEnabled);
        chkClipboardSharing.setChecked(server.clipboardSettings.enabled == true);
        Button btnSendClipboard = findViewById(R.id.btnSendClipboard);
        btnSendClipboard.setEnabled(server.clipboardSettings.enabled);
        Button btnReceiveClipboard = findViewById(R.id.btnReceiveClipboard);
        btnReceiveClipboard.setEnabled(server.filesharingSettings.enabled && server.clipboardSettings.allowServerToSet);

        btnSendClipboard.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                server.sendClipboard();
            }
        });
        btnReceiveClipboard.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                server.requestClipboard();
            }
        });



        // File sharing
        CheckBox chkFileSharingEnabled = findViewById(R.id.chkFileSharingEnabled);
        chkFileSharingEnabled.setChecked(server.filesharingSettings.enabled == true);
        Button btnSendFile = findViewById(R.id.btnSendFile);
        btnSendFile.setEnabled(server.filesharingSettings.enabled);

        View.OnClickListener checkBoxListener = new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                server.syncNotifications = notificationsCheckbox.isChecked();
                server.clipboardSettings.enabled = chkClipboardSharing.isChecked();
                Button btnSendClipboard = findViewById(R.id.btnSendClipboard);
                btnSendClipboard.setEnabled(server.clipboardSettings.enabled);
                Button btnReceiveClipboard = findViewById(R.id.btnReceiveClipboard);
                btnReceiveClipboard.setEnabled(server.filesharingSettings.enabled && server.clipboardSettings.allowServerToSet);


                server.filesharingSettings.enabled = chkFileSharingEnabled.isChecked();
                Button btnSendFile = findViewById(R.id.btnSendFile);
                btnSendFile.setEnabled(server.filesharingSettings.enabled);
            }
        };

        notificationsCheckbox.setOnClickListener(checkBoxListener);
        chkClipboardSharing.setOnClickListener(checkBoxListener);
        chkFileSharingEnabled.setOnClickListener(checkBoxListener);*/

        /*Sets up the checkbox for saving the user's preference regarding sending notifications. It saves whether the user wants to
         * sync notifications or not. It will save the new setting whenever the checkbox is selected or unselected.
         */
        notificationsCheckBox = findViewById(R.id.notificationsCheckbox);
        notificationsCheckBox.setChecked(server.syncNotifications);
        notificationsCheckBox.setOnCheckedChangeListener(new CompoundButton.OnCheckedChangeListener() {
            @Override
            public void onCheckedChanged(CompoundButton compoundButton, boolean b) {
                if(b) {
                    notificationsCheckBox.setChecked(true);
                    server.syncNotifications = true;
                } else {
                    notificationsCheckBox.setChecked(false);
                    server.syncNotifications = false;
                }

                try {
                    server.save();
                } catch (IOException e) {
                    e.printStackTrace();
                }
            }
        });

        /*Sets up the clipboard buttons and checkbox. The buttons will be enabled and the checkbox will be selected
         * if the user has clipboard sharing enabled and unselected and disabled if clipboard sharing is disabled.
         * When the checkbox is changed, it will change the settings for the client and disable/enable and select/unselect the
         * buttons and checkbox, respectively.
         */
        sendClipboard = findViewById(R.id.btnSendClipboard);
        receiveClipboard = findViewById(R.id.btnReceiveClipboard);
        clipboardCheckBox = findViewById(R.id.chkClipboardSharingEnabled);
        clipboardCheckBox.setChecked(server.clipboardSettings.enabled);
        clipboardCheckBox.setOnCheckedChangeListener(new CompoundButton.OnCheckedChangeListener() {
            @Override
            public void onCheckedChanged(CompoundButton compoundButton, boolean b) {
                if(b) {
                    clipboardCheckBox.setChecked(true);
                    server.clipboardSettings.enabled = true;
                    sendClipboard.setEnabled(true);
                    receiveClipboard.setEnabled(true);
                } else {
                    clipboardCheckBox.setChecked(false);
                    server.clipboardSettings.enabled = false;
                    sendClipboard.setEnabled(false);
                    receiveClipboard.setEnabled(false);
                }

                try {
                    server.save();
                } catch (IOException e) {
                    e.printStackTrace();
                }
            }
        });

//If the send clipboard button is clicked, the client will send the server their clipboard data.
        sendClipboard.setEnabled(server.clipboardSettings.enabled);
        sendClipboard.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                server.sendClipboard();
            }
        });

        /* If the receive clipboard button is clicked, the client will receive any clipboard data the server has, if it has
         * clipboard sharing enabled and there is clipboard data to receive.
         */
        receiveClipboard.setEnabled(server.clipboardSettings.enabled);
        receiveClipboard.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                server.requestClipboard();
            }
        });

        /* Sets up the button and checkbox for sending files to the server. The server's settings, and the button's status will
         * change depending on if the checkbox is selected or unselected. It will save whenever the check has changed. The sendFile
         * button does not have an onClickListener because the onClick event is stored in the activity_device.xml file. It calls
         * a method, openFilePicker(View view) down below, so no onClickListener is needed.
         */
        sendFile = findViewById(R.id.btnSendFile);
        sendFile.setEnabled(server.filesharingSettings.enabled);
        fileCheckBox = findViewById(R.id.chkFileSharingEnabled);
        fileCheckBox.setChecked(server.filesharingSettings.enabled);
        fileCheckBox.setOnCheckedChangeListener(new CompoundButton.OnCheckedChangeListener() {
            @Override
            public void onCheckedChanged(CompoundButton compoundButton, boolean b) {
                if(b) {
                    fileCheckBox.setChecked(true);
                    server.filesharingSettings.enabled = true;
                    sendFile.setEnabled(true);
                } else {
                    fileCheckBox.setChecked(false);
                    server.filesharingSettings.enabled = false;
                    sendFile.setEnabled(false);
                }

                try {
                    server.save();
                } catch (IOException e) {
                    e.printStackTrace();
                }
            }
        });

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

    @TargetApi(Build.VERSION_CODES.KITKAT)
    public static String getRealPathFromURI_API19(Uri uri){
        String filePath = "";
        String wholeID = DocumentsContract.getDocumentId(uri);
        String id = wholeID.split(":")[1];

        String[] column = { MediaStore.Images.Media.DATA };

        // where id is equal to
        String sel = MediaStore.Images.Media._ID + "=?";

        Cursor cursor = MainActivity.Context.getContentResolver().query(MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
                column, sel, new String[]{ id }, null);
        int columnIndex = cursor.getColumnIndex(column[0]);
        if (cursor.moveToFirst()) {
            filePath = cursor.getString(columnIndex);
        }
        cursor.close();
        return filePath;
    }

    public void onActivityResult(int requestcode, int resultcode, Intent data) {
        try {
            super.onActivityResult(requestcode, resultcode, data);
            Context context = getApplicationContext();

            if (requestcode == requestCodeMultiple && resultcode == Activity.RESULT_OK) {
                if (data == null) {
                    return;
                }

                if (null != data.getClipData()) {
                    for (int i = 0; i < data.getClipData().getItemCount(); i++) {
                        Uri uri = data.getClipData().getItemAt(i).getUri();
                        if (uri != null) {
                            server.sendFile(uri);
                        }
                    }
                } else {
                    Uri uri = data.getData();
                    String filePath = getRealPathFromURI_API19(uri);
                    if (uri != null) {
                        server.sendFile(uri);
                    }
                }
            }
        } catch (FileNotFoundException e) {
            e.printStackTrace();
        }
    }

    public void openFilePicker(View view) {
        Intent filePickerIntent = new Intent(Intent.ACTION_GET_CONTENT);
        filePickerIntent.setType("*/*");
        filePickerIntent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
        startActivityForResult(filePickerIntent, requestCodeMultiple);
    }
}
