package com.neptune.app;

import androidx.appcompat.app.ActionBar;
import androidx.appcompat.app.AppCompatActivity;

import android.os.Bundle;
import android.widget.CheckBox;
import android.widget.CompoundButton;
import android.widget.TextView;

import com.neptune.app.Backend.Server;

import java.io.IOException;
import java.util.UUID;

public class ClipboardActivity extends AppCompatActivity {

    Server server;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_clipboard);

        ActionBar aBar = getSupportActionBar();
        if(aBar!=null) {
            aBar.setDisplayHomeAsUpEnabled(true);
        }

        String serverId = getIntent().getStringExtra("CB_ID");
        server = MainActivity.serverManager.getServer(UUID.fromString(serverId));

        CheckBox allowServerClipboard = findViewById(R.id.serverRequestClipboard);
        allowServerClipboard.setChecked(server.clipboardSettings.allowServerToGet);
        TextView allowClipboardDescription = findViewById(R.id.requestClipboardDescription);
        allowClipboardDescription.setText(clipboardRequestDescription());
        allowServerClipboard.setOnCheckedChangeListener(new CompoundButton.OnCheckedChangeListener() {
            @Override
            public void onCheckedChanged(CompoundButton compoundButton, boolean b) {
                if(b) {
                    allowServerClipboard.setChecked(true);
                    server.clipboardSettings.allowServerToGet = true;
                } else {
                    allowServerClipboard.setChecked(false);
                    server.clipboardSettings.allowServerToGet = false;
                }
                allowClipboardDescription.setText(clipboardRequestDescription());

                try {
                    server.save();
                } catch (IOException e) {
                    e.printStackTrace();
                }
            }
        });
    }

    public int clipboardRequestDescription() {
        if(server.clipboardSettings.allowServerToGet)
            return R.string.clipboard_server_get_summary_on;
        return R.string.clipboard_server_get_summary_off;
    }

    @Override
    public boolean onSupportNavigateUp() {
        onBackPressed();
        return true;
    }
}