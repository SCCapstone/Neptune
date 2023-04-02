package com.neptune.app;

import android.app.AlertDialog;
import android.app.Dialog;
import android.content.Context;
import android.content.DialogInterface;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.widget.EditText;

import androidx.appcompat.app.AppCompatDialogFragment;

public class RenameDialog extends AppCompatDialogFragment {
    private EditText editName;
    private RenameDialogListener listener;

    private String id = "generic.rename";
    private String title = "Change client name";
    private String hintText = "Client name";

    public RenameDialog() {
        super();
    }

    /**
     * Creates a new rename dialog popup
     * @param id The id returned to your "processRenameDialog" method
     * @param title Title of the dialog
     * @param hintText Hint text for the name text-box
     */
    public RenameDialog(String id, String title, String hintText) {
        super();
        this.id = id;
        this.title = title;
        this.hintText = hintText;
    }

    @Override
    public Dialog onCreateDialog(Bundle savedInstanceState) {
        AlertDialog.Builder builder = new AlertDialog.Builder(getActivity());
        LayoutInflater inflater = getActivity().getLayoutInflater();
        View view = inflater.inflate(R.layout.rename_dialog, null);

        String id = this.id;

        editName = view.findViewById(R.id.editDevName);
        editName.setText(hintText);

        builder.setView(view).setTitle(title).setNegativeButton("Cancel", (dialogInterface, i) -> {

        }).setPositiveButton("Save", (dialogInterface, i) -> {
            String newName = editName.getText().toString();
            listener.processRenameDialog(id, newName);
        });

        return builder.create();
    }

    @Override
    public void onAttach(Context context){
        super.onAttach(context);
        try {
            listener = (RenameDialogListener) context;
        } catch (ClassCastException e) {
            throw new ClassCastException(context.toString() + " must implement RenameDialogListener.");
        }
    }

    public interface RenameDialogListener {
        /**
         * Use to retrieve the text from the rename dialog
         * @param id Id passed on creation of the dialog, used to determine which name this is setting.
         * @param newName Dialog text
         */
        void processRenameDialog(String id, String newName);
    }
}
