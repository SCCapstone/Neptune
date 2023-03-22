package com.neptune.app.Backend.Adapters;

import com.google.gson.TypeAdapter;
import com.google.gson.stream.JsonReader;
import com.google.gson.stream.JsonToken;
import com.google.gson.stream.JsonWriter;
import com.neptune.app.Backend.Structs.ConnectionManagerSettings;

import java.io.IOException;

/**
 * Gson adapter for sterilizing ClientConfigEncryption class
 */
public class ConnectionManagerSettingsAdapter extends TypeAdapter<ConnectionManagerSettings> {

    @Override
    public void write(JsonWriter writer, ConnectionManagerSettings value) throws IOException {
        writer.beginObject();
        writer.name("pollingInterval");
        writer.value(value.pollingInterval);
        writer.name("pollingIntervalTimeUnit");
        writer.value(TimeUnitConverter.toString(value.pollingIntervalTimeUnit));

        writer.name("pingInterval");
        writer.value(value.pingInterval);
        writer.name("pingIntervalTimeUnit");
        writer.value(TimeUnitConverter.toString(value.pingIntervalTimeUnit));

        writer.endObject();
    }

    @Override
    public ConnectionManagerSettings read(JsonReader reader) throws IOException {
        ConnectionManagerSettings connectionManagerSettings = new ConnectionManagerSettings();
        reader.beginObject();
        String fieldName = null;

        while (reader.hasNext()) {
            JsonToken token = reader.peek();

            if (token.equals(JsonToken.NAME))
                fieldName = reader.nextName();

            switch (fieldName) {
                case "pollingInterval":
                    token = reader.peek();
                    if (token == JsonToken.NUMBER)
                        connectionManagerSettings.pollingInterval = reader.nextInt();
                    break;

                case "pollingIntervalTimeUnit":
                    token = reader.peek();
                    if (token == JsonToken.STRING)
                        connectionManagerSettings.pollingIntervalTimeUnit = TimeUnitConverter.fromString(reader.nextString());
                    break;

                case "pingInterval":
                    token = reader.peek();
                    if (token == JsonToken.NUMBER)
                        connectionManagerSettings.pingInterval = reader.nextInt();
                    break;

                case "pingIntervalTimeUnit":
                    token = reader.peek();
                    if (token == JsonToken.STRING)
                        connectionManagerSettings.pingIntervalTimeUnit = TimeUnitConverter.fromString(reader.nextString());
                    break;
            }
        }

        reader.endObject();
        return connectionManagerSettings;
    }
}
