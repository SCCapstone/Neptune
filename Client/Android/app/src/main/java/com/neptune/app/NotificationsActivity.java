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
import java.util.List;
import java.util.UUID;

public class NotificationsActivity extends AppCompatActivity {

    Button showBut;
    ListView notifView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_notifications);

        ActionBar aBar = getSupportActionBar();
        if(aBar!=null) {
            aBar.setDisplayHomeAsUpEnabled(true);
        }

        notifView = findViewById(R.id.listview);
        showBut = findViewById(R.id.check);
        showBut.setVisibility(View.INVISIBLE);
        showBut.performClick();
    }

    public void getallapps(View view) throws PackageManager.NameNotFoundException{
        final Intent mainIntent = new Intent(Intent.ACTION_MAIN, null);
        mainIntent.addCategory(Intent.CATEGORY_LAUNCHER);

        List<ResolveInfo> ril = getPackageManager().queryIntentActivities(mainIntent, 0);
        //List<String> componentList = new ArrayList<String>();
        String name = null;
        int i = 0;

        String[] apps = new String[ril.size()];
        for (ResolveInfo ri : ril) {
            if (ri.activityInfo != null) {
                Resources res = getPackageManager().getResourcesForApplication(ri.activityInfo.applicationInfo);
                if (ri.activityInfo.labelRes != 0) {
                    name = res.getString(ri.activityInfo.labelRes);
                } else {
                    name = ri.activityInfo.applicationInfo.loadLabel(
                            getPackageManager()).toString();
                }
                apps[i] = name;
                i++;
            }
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
        Server server = MainActivity.serverManager.getServer(UUID.fromString(serverId));
        List<String> blacklistedApps = new ArrayList<String>();
        for(int j=0; j< apps.length; j++) {
            blacklistedApps.add(apps[j]);
        }
        /*  These lines of code check if there is a blacklist created for the server and adds all apps to it if there is not one.
            If there is one created, it checks the boxes of the apps not in the blacklist.
         */

        int count = 0;
        if(server.notificationBlacklistApps.size() == 0) {
            server.notificationBlacklistApps = blacklistedApps;
        }
        else {
            for(int k=0; k<apps.length; k++) {
                for(int l=0; l<server.notificationBlacklistApps.size(); l++) {
                    if(apps[k].equals(server.notificationBlacklistApps.get(l))) {
                        break;
                    }
                    else {
                        count++;
                    }
                }
                //This can only save between activity switches, just not between app closes yet.
                if(count == server.notificationBlacklistApps.size()) {
                    //Check the checkbox
                    notifView.setItemChecked(k, true);
                }
                count = 0;
            }
        }

        notifView.setOnItemClickListener(new AdapterView.OnItemClickListener() {
            @Override
            public void onItemClick(AdapterView<?> parent, View view, int position, long id) {
                String selectedItem = (String) parent.getItemAtPosition(position);
                blackListedAppsCheck(server.notificationBlacklistApps, selectedItem);
                try {
                    server.save();
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

                }/* catch (ConnectionManager.FailedToPair e) {
                    e.printStackTrace();
                    if (server != null)
                        server.delete();
                    runOnUiThread(() -> showErrorMessage("Failed to pair device", e.getMessage()));
                }*/
                /* Log to check if the apps are being stored correctly in the list. They do.
                for (int j = 0; j<blacklistedApps.size(); j++) {
                    Log.i("App", blacklistedApps.get(j));
                }*/
            }
        });

    }

    /*This method keeps track of the apps that are checked off so only those app's notifications are sent. It adds and removes apps from the list as they are checked
    off.*/
    private List<String> blackListedAppsCheck(List<String> before, String app) {
        if(before.size()==0) {
            before.add(app);
            return before;
        }

        for(int i=0; i<before.size(); i++) {
            if(app.equals(before.get(i))) {
                before.remove(i);
                return before;
            }
        }
        before.add(app);
        return before;
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