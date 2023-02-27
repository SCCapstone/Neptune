package com.neptune.app;

import androidx.appcompat.app.ActionBar;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;

import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.content.res.Resources;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.widget.AdapterView;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.CheckBox;
import android.widget.ListView;

import com.google.gson.JsonParseException;
import com.neptune.app.Backend.ConnectionManager;
import com.neptune.app.Backend.Server;
import com.neptune.app.Backend.ServerManager;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public class NotificationsActivity extends AppCompatActivity {

    Button showBut;
    ListView notifView;

    Button btnUncheckAll;
    Button btnCheckAll;

    Server server;

    public HashMap<String, String> applicationNamesToPackageNames = new HashMap<>();

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_notifications);

        ActionBar aBar = getSupportActionBar();
        if(aBar!=null) {
            aBar.setDisplayHomeAsUpEnabled(true);
        }

        btnUncheckAll = findViewById(R.id.btnUncheckAll);
        btnCheckAll = findViewById(R.id.btnCheckAlll);

        notifView = findViewById(R.id.listview);
        showBut = findViewById(R.id.check); // ?????????
        showBut.setVisibility(View.INVISIBLE);
        showBut.performClick();
    }

    public void getallapps(View view) throws PackageManager.NameNotFoundException{
        final Intent mainIntent = new Intent(Intent.ACTION_MAIN, null);
        mainIntent.addCategory(Intent.CATEGORY_LAUNCHER);

        List<ResolveInfo> ril = getPackageManager().queryIntentActivities(mainIntent, 0);
        //List<String> componentList = new ArrayList<String>();
        String name;
        List<String> appsList = new ArrayList<>();
        for (ResolveInfo ri : ril) {
            try {
                if (ri.activityInfo != null) {
                    Resources res = getPackageManager().getResourcesForApplication(ri.activityInfo.applicationInfo);
                    if (ri.activityInfo.labelRes != 0) {
                        name = res.getString(ri.activityInfo.labelRes);
                    } else {
                        name = ri.activityInfo.applicationInfo.loadLabel(
                                getPackageManager()).toString();
                    }
                    appsList.add(name);
                    applicationNamesToPackageNames.put(name, ri.activityInfo.applicationInfo.packageName);
                }
            } catch (Exception r) {};
        }

        String[] apps = new String[appsList.size()];
        for (int i = 0; i<appsList.size(); i++) {
            apps[i] = appsList.get(i);
        }
        Arrays.sort(apps);
        //notifView.setAdapter(new ArrayAdapter<String>(NotificationsActivity.this, android.R.layout.simple_list_item_multiple_choice, apps));
        ArrayAdapter<String> allApps = new ArrayAdapter<String>(NotificationsActivity.this, android.R.layout.simple_list_item_multiple_choice, apps);
        notifView.setAdapter(allApps);

        /*I did it this way because List<String> blacklistedApps = new ArrayList<String>(Arrays.asList(apps)) didn't work. Neither did making the blacklist global.
        I don't know why, it was just being weird so I made the blacklist this way. Will try to fix if there's time but it works now.
        This also grabs the server ID from the other activities so that we can call the correct server's blacklist here.
        * */
        String serverId = getIntent().getStringExtra("ID2");
        server = MainActivity.serverManager.getServer(UUID.fromString(serverId));
        /*  These lines of code check if there is a blacklist created for the server and adds all apps to it if there is not one.
            If there is one created, it checks the boxes of the apps not in the blacklist.
         */

        if(server.notificationBlacklistApps == null) {
            // No blacklist created, make one
            server.notificationBlacklistApps = new ArrayList<String>();
            for (String packageName : applicationNamesToPackageNames.values()) {
                server.notificationBlacklistApps.add(packageName);
            }
        } else {
            for (int a = 0; a<notifView.getCount(); a++) {
                String appName = (String) notifView.getItemAtPosition(a);
                String appPackage = applicationNamesToPackageNames.get(appName);
                if (!server.notificationBlacklistApps.contains(appPackage)) {
                    //Log.i("PACKAGE BLOCKED BY SERVER, CHECKING:", appPackage);
                    notifView.setItemChecked(a, true);
                }
            }
        }

        notifView.setOnItemClickListener(new AdapterView.OnItemClickListener() {
            @Override
            public void onItemClick(AdapterView<?> parent, View view, int position, long id) {
                save();
            }
        });

        btnCheckAll.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                for (int a = 0; a<notifView.getCount(); a++) {
                    notifView.setItemChecked(a, true);
                }
                save();
            }
        });

        btnUncheckAll.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                for (int a = 0; a<notifView.getCount(); a++) {
                    notifView.setItemChecked(a, false);
                }
                save();
            }
        });
    }

    private void save() {
        try {
            for (int i = 0; i<notifView.getCount(); i++) {
                String appName = (String) notifView.getItemAtPosition(i);
                String appPackage = applicationNamesToPackageNames.get(appName);
                if (notifView.isItemChecked(i)) {
                    //Log.i("PACKAGE NOT ON LIST:", appPackage);
                    if (server.notificationBlacklistApps.contains(appPackage))
                        server.notificationBlacklistApps.remove(appPackage);
                } else {
                    //Log.i("PACKAGE ON LIST:", appPackage);
                    if (!server.notificationBlacklistApps.contains(appPackage))
                        server.notificationBlacklistApps.add(appPackage);
                }
            }

            server.save();
        } catch (Exception e) {
            e.printStackTrace();
            showErrorMessage("Failed to update and save configuration!", e.getMessage());
        }
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
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

    //This method supports going to the previous activity. This allows users to move between activities that directly link to each other.
    @Override
    public boolean onSupportNavigateUp() {
        onBackPressed();
        return true;
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
}