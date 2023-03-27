package com.neptune.app.Backend.Adapters;

import com.google.gson.TypeAdapter;
import com.google.gson.stream.JsonReader;
import com.google.gson.stream.JsonToken;
import com.google.gson.stream.JsonWriter;
import com.neptune.app.Backend.Structs.ServerClipboardSettings;

import java.io.IOException;

/**
 * Gson serializer for ServerClipboardSettingsAdapter
 */
public class ServerClipboardSettingsAdapter extends TypeAdapter<ServerClipboardSettings> {

    @Override
    public void write(JsonWriter writer, ServerClipboardSettings value) throws IOException {
        writer.beginObject();

        writer.name("enabled");
        writer.value(value.enabled);

        writer.name("allowServerToSet");
        writer.value(value.allowServerToSet);
        writer.name("allowServerToGet");
        writer.value(value.allowServerToGet);

        writer.name("synchronizeClipboardToServer");
        writer.value(value.synchronizeClipboardToServer);

        writer.endObject();
    }

    @Override
    public ServerClipboardSettings read(JsonReader reader) throws IOException {
        ServerClipboardSettings myObject = new ServerClipboardSettings(); // Make this your type!
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

                case "allowServerToSet":
                    token = reader.peek();
                    if (token == JsonToken.BOOLEAN)
                        myObject.allowServerToSet = reader.nextBoolean();
                    break;
                case "allowServerToGet":
                    token = reader.peek();
                    if (token == JsonToken.BOOLEAN)
                        myObject.allowServerToGet = reader.nextBoolean();
                    break;

                case "synchronizeClipboardToServer":
                    token = reader.peek();
                    if (token == JsonToken.BOOLEAN)
                        myObject.synchronizeClipboardToServer = reader.nextBoolean();
                    break;

                default:
                    reader.nextNull();
                    break;
            }
        }

        reader.endObject();
        return myObject;
    }
}
