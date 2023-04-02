package com.neptune.app;

import androidx.activity.result.ActivityResult;
import androidx.activity.result.ActivityResultCallback;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.appcompat.app.ActionBar;
import androidx.appcompat.app.AppCompatActivity;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.widget.CheckBox;
import android.widget.CompoundButton;
import android.widget.ImageView;
import android.widget.TextView;

import com.neptune.app.Backend.Server;

import java.io.IOException;
import java.util.UUID;

public class FileActivity extends AppCompatActivity {

    private Server server;
    private TextView destinationFolder;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_file);

        ActionBar aBar = getSupportActionBar();
        if(aBar!=null) {
            aBar.setDisplayHomeAsUpEnabled(true);
        }

        String serverId = getIntent().getStringExtra("ID3");
        server = MainActivity.serverManager.getServer(UUID.fromString(serverId));

        //Setting the TextView that contains the destination folder for incoming files from the server.
        destinationFolder = findViewById(R.id.destinationFolder);
        destinationFolder.setText(server.filesharingSettings.receivedFilesDirectory);

        //When the user clicks on the image view, it calls code down below to open the files app and store the folder selected.
        ImageView chooseDestination = findViewById(R.id.chooseDestinationFolder);
        chooseDestination.setOnClickListener(new ImageView.OnClickListener() {
            @Override
            public void onClick(View view) {
                openFolder();
            }
        });

        CheckBox allowServerUpload = findViewById(R.id.serverUploadFile);
        TextView allowServerUploadText = findViewById(R.id.receiveFilesDescription);
        allowServerUpload.setChecked(server.filesharingSettings.allowServerToUpload);
        allowServerUploadText.setText(setServerReceiveText());
        allowServerUpload.setOnCheckedChangeListener(new CompoundButton.OnCheckedChangeListener() {
            @Override
            public void onCheckedChanged(CompoundButton compoundButton, boolean b) {
                if(b) {
                    allowServerUpload.setChecked(true);
                    server.filesharingSettings.allowServerToUpload = true;
                } else {
                    allowServerUpload.setChecked(false);
                    server.filesharingSettings.allowServerToUpload = false;
                }
                allowServerUploadText.setText(setServerReceiveText());

                try {
                    server.save();
                } catch (IOException e) {
                    e.printStackTrace();
                }
            }
        });

        //CheckBox for enabling or disabling notifications upon the client receiving a file.
        CheckBox notify = findViewById(R.id.notifyOnReceive);
        notify.setChecked(server.filesharingSettings.notifyOnServerUpload);
        notify.setOnCheckedChangeListener(new CompoundButton.OnCheckedChangeListener() {
            @Override
            public void onCheckedChanged(CompoundButton compoundButton, boolean b) {
                if(b) {
                    notify.setChecked(true);
                    server.filesharingSettings.notifyOnServerUpload = true;
                } else {
                    notify.setChecked(false);
                    server.filesharingSettings.notifyOnServerUpload = false;
                }

                try {
                    server.save();
                } catch (IOException e) {
                    e.printStackTrace();
                }
            }
        });

        CheckBox autoAccept = findViewById(R.id.autoAcceptFiles);
        TextView autoAcceptText = findViewById(R.id.autoAcceptFilesDescription);
        autoAccept.setChecked(server.filesharingSettings.requireConfirmationOnServerUploads);
        autoAcceptText.setText(setAutoAcceptFileText());
        autoAccept.setOnCheckedChangeListener(new CompoundButton.OnCheckedChangeListener() {
            @Override
            public void onCheckedChanged(CompoundButton compoundButton, boolean b) {
                if(b) {
                    autoAccept.setChecked(true);
                    server.filesharingSettings.requireConfirmationOnServerUploads = true;
                } else {
                    autoAccept.setChecked(false);
                    server.filesharingSettings.requireConfirmationOnServerUploads = false;
                }
                autoAcceptText.setText(setAutoAcceptFileText());

                try {
                    server.save();
                } catch (IOException e) {
                    e.printStackTrace();
                }
            }
        });
    }

    //Opens the document tree so the user can select a folder to store their documents in.
    public void openFolder() {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
        activityResultLauncher.launch(intent);
    }

    //Activity result launcher for opening the document tree. This saves the folder chosen as the destination folder for all incoming files from the server.
    ActivityResultLauncher<Intent> activityResultLauncher = registerForActivityResult(new ActivityResultContracts.StartActivityForResult(),
            new ActivityResultCallback<ActivityResult>() {
        @Override
        public void onActivityResult(ActivityResult result) {
            if(result.getResultCode() == Activity.RESULT_OK) {
                Intent intent = result.getData();
                Uri uri = intent.getData();
                //Log.e("SLDKJG", uri.toString());
                server.filesharingSettings.receivedFilesDirectory = uri.toString();
                destinationFolder.setText(uri.toString());

                try {
                    server.save();
                } catch (IOException e) {
                    e.printStackTrace();
                }

                //Log.e("SDFDFFDS", server.filesharingSettings.receivedFilesDirectory);
            }
        }
    });

    public int setAutoAcceptFileText() {
        if(server.filesharingSettings.requireConfirmationOnServerUploads)
            return R.string.auto_accept_files_summary_on;
        return R.string.auto_accept_files_summary_off;
    }

    public int setServerReceiveText() {
        if(server.filesharingSettings.allowServerToUpload)
            return R.string.filesharing_server_set_summary_on;
        return R.string.filesharing_server_set_summary_off;
    }

    @Override
    public boolean onSupportNavigateUp() {
        onBackPressed();
        return true;
    }
}