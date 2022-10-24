package com.neptune.app;

import androidx.appcompat.app.ActionBar;
import androidx.appcompat.app.AppCompatActivity;
import androidx.fragment.app.DialogFragment;

import android.os.Bundle;
import android.widget.ImageView;
import android.widget.RadioButton;
import android.widget.TextView;
import android.content.Intent;
import android.view.View;


public class DeviceActivity extends AppCompatActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_device);

        ActionBar aBar = getSupportActionBar();
        if(aBar!=null) {
            aBar.setDisplayHomeAsUpEnabled(true);
        }

        ImageView notifs = (ImageView) findViewById(R.id.notifSets);
        notifs.setOnClickListener(new View.OnClickListener(){
            public void onClick(View v) {
                startActivity(new Intent(DeviceActivity.this, NotificationsActivity.class));
            }
        });

        TextView files = (TextView) findViewById(R.id.test1);
        files.setOnClickListener(new View.OnClickListener(){
            public void onClick(View v) {
                startActivity(new Intent(DeviceActivity.this, FileActivity.class));
            }
        });
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