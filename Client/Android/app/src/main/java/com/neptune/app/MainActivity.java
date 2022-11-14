package com.neptune.app;

//Create a method that searches the ServerManager's Map of servers and compare the serverId with the textView that we wanna delete.
//Use either list views to make a lists of the names and edit buttons, or create a new TextView and ImageView for each new device. Depending on what you choose
// you will have to delete the entries from the list or the entire views when removing a device.
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import androidx.fragment.app.DialogFragment;

import android.content.DialogInterface;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.content.Intent;

public class MainActivity extends AppCompatActivity implements RenameDialog.RenameDialogListener{
    //public ServerManager serverManager;
    //public Config config
    private TextView devName;
    private ImageView editName;
    private Button add;
    private AlertDialog addDialog;
    private LinearLayout addLine;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        devName = (TextView) findViewById(R.id.name);
        editName = (ImageView) findViewById(R.id.editDevName);
        add = (Button) findViewById(R.id.addDev);
        addLine = findViewById(R.id.container);
        buildAddDialog();

        devName.setOnClickListener(new TextView.OnClickListener(){
            @Override
            public void onClick(View v) {
                startActivity(new Intent(MainActivity.this, DeviceActivity.class));
            }
        });

        editName.setOnClickListener(new ImageView.OnClickListener(){
            @Override
            public void onClick(View v) {
                openDialog();
            }
        });

        add.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                addDialog.show();
            }
        });
    }

    private void buildAddDialog() {
        AlertDialog.Builder builder = new AlertDialog.Builder(this);
        View view = getLayoutInflater().inflate(R.layout.add_dialog, null);

        final EditText name = view.findViewById(R.id.nameEdit);

        builder.setView(view);
        builder.setTitle("Enter name")
                .setPositiveButton("OK", new DialogInterface.OnClickListener() {
                    @Override
                    public void onClick(DialogInterface dialog, int which) {
                        addNameLine(name.getText().toString());
                    }
                })
                .setNegativeButton("Cancel", new DialogInterface.OnClickListener() {
                    @Override
                    public void onClick(DialogInterface dialog, int which) {

                    }
                });

        addDialog = builder.create();
    }

    public void addNameLine(String name) {
        final View view = getLayoutInflater().inflate(R.layout.name_line, null);

        devName = view.findViewById(R.id.name);
        editName = view.findViewById(R.id.editName1);

        devName.setText(name);
        devName.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                startActivity(new Intent(MainActivity.this, DeviceActivity.class));
            }
        });

        editName.setOnClickListener(new ImageView.OnClickListener(){
            @Override
            public void onClick(View v) {
                openDialog();
            }
        });

        addLine.addView(view);
    }

    public void openDialog(){
        RenameDialog de = new RenameDialog();
        de.show(getSupportFragmentManager(), "rename dialog");
    }

    @Override
    public void applyTexts(String n){
        devName.setText(n);
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