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

    private String title = "Change client name";
    private String hintText = "Client name";

    public RenameDialog() {
        super();
    }

    public RenameDialog(String title, String hintText) {
        super();
        this.title = title;
        this.hintText = hintText;
    }

    @Override
    public Dialog onCreateDialog(Bundle savedInstanceState) {
        AlertDialog.Builder builder = new AlertDialog.Builder(getActivity());
        LayoutInflater inflater = getActivity().getLayoutInflater();
        View view = inflater.inflate(R.layout.rename_dialog, null);

        editName = view.findViewById(R.id.editDevName);
        editName.setText(hintText);

        builder.setView(view).setTitle(title).setNegativeButton("Cancel", new DialogInterface.OnClickListener() {
            @Override
            public void onClick(DialogInterface dialogInterface, int i) {

            }
        }).setPositiveButton("Save", new DialogInterface.OnClickListener() {
            @Override
            public void onClick(DialogInterface dialogInterface, int i) {
                String device = editName.getText().toString();
                listener.applyTexts(device);
            }
        });

        return builder.create();
    }

    @Override
    public void onAttach(Context context){
        super.onAttach(context);
        try {
            listener = (RenameDialogListener) context;
        } catch (ClassCastException e) {
            throw new ClassCastException(context.toString() + "must implement DialogExListener");
        }
    }

    public interface RenameDialogListener {
        void applyTexts(String devName);
    }
}
