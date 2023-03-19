package com.neptune.app;

import androidx.appcompat.app.ActionBar;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;

import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.content.res.Resources;
import android.graphics.drawable.Drawable;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.widget.Button;
import android.widget.CheckBox;
import android.widget.CompoundButton;
import android.widget.ImageView;
import android.widget.LinearLayout;

import com.google.gson.JsonParseException;
import com.neptune.app.Backend.ConnectionManager;
import com.neptune.app.Backend.Server;
import com.neptune.app.Backend.ServerManager;

import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.UUID;

public class NotificationsActivity extends AppCompatActivity {

    private Button btnCheckAll;
    private Button btnUncheckAll;
    private Button showBut;
    private CheckBox appName;
    private ImageView appIcon;
    private LinearLayout appsLayout;
    private List<String> keys;
    private Map<String, Drawable> allApps;
    private Map<String, Drawable> sortedApps;
    public HashMap<String, String> applicationNamesToPackageNames = new HashMap<>();
    private Server server;

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

        appsLayout = findViewById(R.id.appList);

        showBut = findViewById(R.id.check); // ?????????
        showBut.setVisibility(View.INVISIBLE);
        showBut.performClick();
    }

    public void getallapps(View view) throws PackageManager.NameNotFoundException{
        final Intent mainIntent = new Intent(Intent.ACTION_MAIN, null);
        mainIntent.addCategory(Intent.CATEGORY_LAUNCHER);

        List<ResolveInfo> ril = getPackageManager().queryIntentActivities(mainIntent, 0);
        allApps = new HashMap<String, Drawable>();
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
                    //appsList.add(name);
                    allApps.put(name, ri.activityInfo.loadIcon(getPackageManager()));
                    applicationNamesToPackageNames.put(name, ri.activityInfo.applicationInfo.packageName);
                }
            } catch (Exception r) {};
        }

        //Takes all the app names that were gathered and stored in the map and sorts them in alphabetical order.
        sortedApps = new TreeMap<>();
        sortedApps.putAll(allApps);

        //Creates a list of the keys of map item, which is the app name. This is for easier use down the road.
        keys = new ArrayList<String>();
        for(String key : sortedApps.keySet()) {
            keys.add(key);
        }

        //This populates the scroll view that contains the linear layout of app icons and their names in a checkbox.
        for(Map.Entry<String, Drawable> b : sortedApps.entrySet()) {
            loadLinearLayout(b.getKey(), b.getValue());
        }

        //This grabs the server's ID that was passed from the previous activity, so we can ensure we are editing the correct server's blacklist.
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
            for (int a = 0;a<sortedApps.size(); a++) {
                String appName = keys.get(a);
                String appPackage = applicationNamesToPackageNames.get(appName);
                if (!server.notificationBlacklistApps.contains(appPackage)) {
                    //Log.i("PACKAGE BLOCKED BY SERVER, CHECKING:", appPackage);
                    ((CheckBox)(appsLayout.findViewWithTag(appName))).performClick();
                }
            }
        }
    }

    private void save() {
        CheckBox currentCheckBox;
        try {
            for (int i = 0; i<keys.size(); i++) {
                String name = keys.get(i);
                String appPackage = applicationNamesToPackageNames.get(name);
                currentCheckBox = ((CheckBox)(appsLayout.findViewWithTag(appName)));

                if(currentCheckBox == null)
                    continue;

                if (currentCheckBox.isChecked()) {
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

    //Loads each item in the LinearLayout that contains all the apps icons and checkboxes with their names.
    public void loadLinearLayout(String name, Drawable icon) {
        appsLayout = findViewById(R.id.appList);
        final View appsView = getLayoutInflater().inflate(R.layout.app_line, null);
        appName = appsView.findViewById(R.id.appName);
        appName.setTag(name);
        appIcon = appsView.findViewById(R.id.appIcon);
        appName.setText(name);
        appIcon.setImageDrawable(icon);

        //When a checkbox is clicked and the box is changed for unchecked to checked or vice versa, the blacklist will be updated and saved.
        appName.setOnCheckedChangeListener(new CompoundButton.OnCheckedChangeListener() {
            @Override
            public void onCheckedChanged(CompoundButton compoundButton, boolean b) {
                if(b) {
                    server.notificationBlacklistApps.remove(applicationNamesToPackageNames.get(name));
                } else {
                    server.notificationBlacklistApps.add(applicationNamesToPackageNames.get(name));
                }

                try {
                    server.save();
                } catch (IOException e) {
                    e.printStackTrace();
                }
            }
        });

        //This is the on click listener for the button to check all the checkboxes.
        btnCheckAll.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                for (int a = 0; a<sortedApps.size(); a++) {
                    ((CheckBox)(appsLayout.findViewWithTag(keys.get(a)))).setChecked(true);
                }
                save();
            }
        });

        //This is the on click listener for the button to uncheck all the checkboxes.
        btnUncheckAll.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                for (int a = 0; a<sortedApps.size(); a++) {
                    ((CheckBox)(appsLayout.findViewWithTag(keys.get(a)))).setChecked(false);
                }
                save();
            }
        });

        appsLayout.addView(appsView);
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