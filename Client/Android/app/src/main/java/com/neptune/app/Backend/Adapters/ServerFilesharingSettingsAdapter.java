package com.neptune.app.Backend.Adapters;

import com.google.gson.TypeAdapter;
import com.google.gson.stream.JsonReader;
import com.google.gson.stream.JsonToken;
import com.google.gson.stream.JsonWriter;
import com.neptune.app.Backend.Structs.ServerClipboardSettings;
import com.neptune.app.Backend.Structs.ServerFilesharingSettings;

import java.io.IOException;

/**
 * Gson serializer for ServerClipboardSettingsAdapter
 */
public class ServerFilesharingSettingsAdapter extends TypeAdapter<ServerFilesharingSettings> {

    @Override
    public void write(JsonWriter writer, ServerFilesharingSettings value) throws IOException {
        writer.beginObject();

        writer.name("enabled");
        writer.value(value.enabled);

        writer.name("allowServerToUpload");
        writer.value(value.allowServerToUpload);
        writer.name("allowServerToDownload");
        writer.value(value.allowServerToDownload);

        writer.name("requireConfirmationOnServerUploads");
        writer.value(value.requireConfirmationOnServerUploads);
        writer.name("notifyOnServerUpload");
        writer.value(value.notifyOnServerUpload);

        writer.name("receivedFilesDirectory");
        writer.value(value.receivedFilesDirectory);
        writer.endObject();
    }

    @Override
    public ServerFilesharingSettings read(JsonReader reader) throws IOException {
        ServerFilesharingSettings myObject = new ServerFilesharingSettings(); // Make this your type!
        reader.beginObject();
        String fieldName = null;

        while (reader.hasNext()) {
            JsonToken token = reader.peek();

            if (token.equals(JsonToken.NAME))
                fieldName = reader.nextName();

            switch (fieldName) {
                case "enabled":
                    token = reader.peek();
                    if (token == JsonToken.BOOLEAN)
                        myObject.enabled = reader.nextBoolean();
                    break;

                case "allowServerToUpload":
                    token = reader.peek();
                    if (token == JsonToken.BOOLEAN)
                        myObject.allowServerToUpload = reader.nextBoolean();
                    break;
                case "allowServerToDownload":
                    token = reader.peek();
                    if (token == JsonToken.BOOLEAN)
                        myObject.allowServerToDownload = reader.nextBoolean();
                    break;

                case "requireConfirmationOnServerUploads":
                    token = reader.peek();
                    if (token == JsonToken.BOOLEAN)
                        myObject.requireConfirmationOnServerUploads = reader.nextBoolean();
                    break;
                case "notifyOnServerUpload":
                    token = reader.peek();
                    if (token == JsonToken.BOOLEAN)
                        myObject.notifyOnServerUpload = reader.nextBoolean();
                    break;


                case "receivedFilesDirectory":
                    token = reader.peek();
                    if (token == JsonToken.BOOLEAN)
                        myObject.receivedFilesDirectory = reader.nextString();
                    break;
            }
        }

        reader.endObject();
        return myObject;
    }
}
