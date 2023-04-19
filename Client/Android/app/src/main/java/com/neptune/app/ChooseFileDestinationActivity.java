package com.neptune.app;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.appcompat.app.ActionBar;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import androidx.documentfile.provider.DocumentFile;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.widget.Button;
import android.widget.Toast;

import com.neptune.app.Backend.Server;

import java.lang.ref.WeakReference;
import java.util.UUID;

public class ChooseFileDestinationActivity extends AppCompatActivity {

    final private String TAG = "ChooseFileDestination-";

    private Button folderPicker;

    private ActivityResultLauncher<Intent> folderPickerLauncher;

    //private Uri incomingFilesDirectoryUri;

    private Server server;


    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_choose_file_destination);

        String serverId = getIntent().getStringExtra(Constants.EXTRA_SERVER_ID);
        server = MainActivity.serverManager.getServer(UUID.fromString(serverId));
        if (server == null) {
            showErrorMessage("No such server found", "I'm sorry, but that server does not exist. Go back and try again?");
            finish();
            return;
        }

        ActionBar actionBar = getSupportActionBar();
        if(actionBar!=null) {
            actionBar.setDisplayHomeAsUpEnabled(true);
            String actionBarTitle = getString(R.string.title_activity_server_settings_placeholder, server.friendlyName);
            actionBar.setTitle(actionBarTitle);
        }

        folderPicker = findViewById(R.id.folderchoosing_button);
        folderPicker.setOnClickListener((view) -> openFolderPickerToSetDestinationDirectory());

        folderPickerLauncher = registerForActivityResult(
                new ActivityResultContracts.StartActivityForResult(),
                result -> {
                    Intent data = result.getData();
                    if (result.getResultCode() != Activity.RESULT_OK) {
                        Log.d(TAG, "openFolderPickerToSetDestinationDirectory: user canceled");
                        Toast.makeText(this, "Canceled", Toast.LENGTH_SHORT).show();
                        return;
                    }

                    if (data == null) {
                        Log.w(TAG, "openFolderPickerToSetDestinationDirectory: no intent data");
                        Toast.makeText(this, "No selected folder", Toast.LENGTH_SHORT).show();
                        return;
                    }

                    Uri uri = data.getData();
                    if (isValidContentUri(uri)) {
                        getContentResolver().takePersistableUriPermission(uri, (Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION));
                        ServerSettingsActivity.incomingFilesDirectoryUri = uri;
                        server.filesharingSettings.receivedFilesDirectory = getFriendlyNameFromUri(ServerSettingsActivity.incomingFilesDirectoryUri);
                        Intent intent = new Intent();
                        intent.putExtra(Constants.EXTRA_SERVER_ID, this.server.serverId.toString());
                        intent.putExtra(Constants.CHOOSE_FOLDER, this.server.filesharingSettings.receivedFilesDirectory);
                        setResult(Activity.RESULT_OK, intent);
                        finish();
                    } else {
                        Toast.makeText(this, "Invalid content Uri", Toast.LENGTH_SHORT).show();
                    }
                }
        );
    }

    /**
     * Opens a file picker dialog with the selected folder being set as the incoming files directory
     */
    private void openFolderPickerToSetDestinationDirectory() {
        Intent folderPicker = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
        folderPicker.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        folderPicker.putExtra(Intent.EXTRA_TITLE, "Set incoming files destination");
        folderPickerLauncher.launch(folderPicker);
    }

    /**
     * Checks whether a content uri is valid or not (and we can access it)
     * @param contentUri Content uri to render?
     * @return Friendly file/folder name
     */
    public static boolean isValidContentUri(Uri contentUri) {
        try {
            DocumentFile documentFile = DocumentFile.fromTreeUri(MainActivity.Context, contentUri);

            if (documentFile == null)
                return false;

            return documentFile.exists() && documentFile.canWrite();
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    /**
     * Gets the folder name of a content uri
     * @param uri Uri to use
     * @return Friendly readable name
     */
    private String getFriendlyNameFromUri(Uri uri) {
        if (uri == null)
            return "";

        try  {
            DocumentFile documentFile = DocumentFile.fromTreeUri(MainActivity.Context, uri);
            if (documentFile == null)
                return "";

            if (documentFile.getParentFile() != null) {
                return documentFile.getParentFile().getName() + "/" + documentFile.getName();
            }
            return documentFile.getName();
        } catch (Exception e) {
            Log.e(TAG, "getFriendlyNameFromUri: error", e);
            return "";
        }
    }

    @Override
    public boolean onSupportNavigateUp() {
        onBackPressed();
        return true;
    }

    /**
     * Display an error message to the user
     * @param title Dialog title
     * @param message Dialog message
     */
    public void showErrorMessage(String title, String message) {
        WeakReference<ChooseFileDestinationActivity> mActivityRef = new WeakReference<>(this);

        if (mActivityRef.get() != null && !mActivityRef.get().isFinishing()) {
            AlertDialog.Builder alertBuilder = new AlertDialog.Builder(this);
            alertBuilder.setTitle(title);
            alertBuilder.setMessage(message);
            alertBuilder.setPositiveButton("Ok", (dialog, which) -> {
                // do stuff here?
            });

            alertBuilder.create().show();
        }
    }
}