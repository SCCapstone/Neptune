package com.neptune.app.Backend.Adapters;

import com.google.gson.TypeAdapter;
import com.google.gson.stream.JsonReader;
import com.google.gson.stream.JsonToken;
import com.google.gson.stream.JsonWriter;
import com.neptune.app.Backend.Structs.ClientConfigEncryption;

import java.io.IOException;

/**
 * Gson adapter for sterilizing ClientConfigEncryption class
 */
public class ClientConfigEncryptionAdapter extends TypeAdapter<ClientConfigEncryption> {

    @Override
    public void write(JsonWriter writer, ClientConfigEncryption value) throws IOException {
        writer.beginObject();
        writer.name("enabled");
        writer.value(value.enabled);

        writer.name("active");
        writer.value(value.active);

        writer.name("newKeyLength");
        writer.value(value.newKeyLength);

        writer.endObject();
    }

    @Override
    public ClientConfigEncryption read(JsonReader reader) throws IOException {
        ClientConfigEncryption clientConfigEncryption = new ClientConfigEncryption();
        reader.beginObject();
        String fieldName = null;

        while (reader.hasNext()) {
            JsonToken token = reader.peek();

            if (token.equals(JsonToken.NAME))
                fieldName = reader.nextName();

            switch (fieldName) {
                case "enabled":
                    token = reader.peek();
                    clientConfigEncryption.enabled = reader.nextBoolean();
                    break;

                case "active":
                    token = reader.peek();
                    clientConfigEncryption.active = reader.nextBoolean();
                    break;

                case "newKeyLength":
                    token = reader.peek();
                    clientConfigEncryption.newKeyLength = reader.nextInt();
                    break;
            }
        }

        reader.endObject();
        return clientConfigEncryption;
    }
}
