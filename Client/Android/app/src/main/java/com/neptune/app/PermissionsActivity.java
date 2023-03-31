package com.neptune.app;

import androidx.appcompat.app.AppCompatActivity;

import android.content.ComponentName;
import android.content.Intent;
import android.os.Bundle;
import android.provider.Settings;
import android.view.View;
import android.widget.Button;

public class PermissionsActivity extends AppCompatActivity {

    private Button settingsButton;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_permissions);

        settingsButton = findViewById(R.id.openSettings);
        settingsButton.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                try {
                    ComponentName componentName = new ComponentName(getPackageName(), com.neptune.app.Backend.NotificationListenerService.class.getName());
                    Intent intent = new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS);
                    intent.putExtra(Settings.EXTRA_NOTIFICATION_LISTENER_COMPONENT_NAME, componentName.flattenToString());
                    startActivity(intent);
                } catch (Exception ignored) {
                    Intent intent = new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS);
                    startActivity(intent);
                }
            }
        });
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (MainActivity.isNotificationServiceEnabled()) {
            finish();
        }
    }

    @Override
    public void onBackPressed() {
        // Call finishAffinity() to close all activities in the task stack
        finishAffinity();
    }
}