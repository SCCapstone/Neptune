package com.neptune.app;

import androidx.appcompat.app.AppCompatActivity;
import androidx.fragment.app.DialogFragment;

import android.os.Bundle;
import android.view.View;
import android.widget.TextView;
import android.content.Intent;

import org.w3c.dom.Text;

public class MainActivity extends AppCompatActivity {
    //public ServerManager serverManager;
    //public Config config

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        TextView devName = (TextView) findViewById(R.id.test1);
        devName.setOnClickListener(new View.OnClickListener(){
            public void onClick(View v) {
                startActivity(new Intent(MainActivity.this, DeviceActivity.class));
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

    public void showRenameDialog() {

    }

    @Override
    protected void onStop() {
        super.onStop();
    }
}