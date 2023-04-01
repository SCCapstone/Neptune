package com.neptune.app;

import androidx.activity.result.ActivityResult;
import androidx.activity.result.ActivityResultCallback;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.appcompat.app.ActionBar;
import androidx.appcompat.app.AppCompatActivity;
import androidx.documentfile.provider.DocumentFile;
import androidx.fragment.app.DialogFragment;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.widget.Button;
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

        //CheckBox for enabling or disabling notifications upon the client receiving a file.
        CheckBox notify = findViewById(R.id.notifyOnReceived);
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

    @Override
    public boolean onSupportNavigateUp() {
        onBackPressed();
        return true;
    }
}