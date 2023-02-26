package com.neptune.app;//comment

import androidx.appcompat.app.ActionBar;
import androidx.appcompat.app.AppCompatActivity;
import androidx.fragment.app.DialogFragment;

import android.app.Activity;
import android.os.Bundle;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ImageView;
import android.widget.RadioButton;
import android.widget.TextView;
import android.content.Intent;
import android.view.View;

import com.neptune.app.Backend.ConnectionManager;
import com.neptune.app.Backend.Server;

import java.util.UUID;


public class DeviceActivity extends AppCompatActivity {
    //public Button connect;
    //public Button temp;
    public ConnectionManager cm;
    private Button delete;
    private EditText ipAddress;


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

    public void onRadioButtonClicked(View view) {
        boolean checked = ((RadioButton) view).isChecked();

        switch(view.getId()) {
            case R.id.radio_auto:
                if(checked)
                    //
                break;
            case R.id.radio_key:
                if(checked)
                    //
                break;
        }
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

}
