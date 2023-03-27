package com.neptune.app.Backend.Adapters;

import com.google.gson.TypeAdapter;
import com.google.gson.stream.JsonReader;
import com.google.gson.stream.JsonToken;
import com.google.gson.stream.JsonWriter;

import java.io.IOException;

/**
 * Example wrapper. Write them like this.
 * !!DO NOT USE THIS!!
 *
 * Add public in front of class when you use this, change the TypeAdapter<.type> to your type.
 */
class ExampleAdapter extends TypeAdapter<ExampleAdapter> {

    @Override
    public void write(JsonWriter writer, ExampleAdapter value) throws IOException {
        writer.beginObject();

        //writer.name("propertyName");
        //writer.value(value.propertyName);

        writer.endObject();
    }

    @Override
    public ExampleAdapter read(JsonReader reader) throws IOException {
        ExampleAdapter myObject = new ExampleAdapter(); // Make this your type!
        reader.beginObject();
        String fieldName = null;

        String jsonKeyValue = "";

        while (reader.hasNext()) {
            JsonToken token = reader.peek();

            if (token.equals(JsonToken.NAME))
                fieldName = reader.nextName();

            switch (fieldName) {
                case "jsonKey":
                    token = reader.peek();
                    if (token == JsonToken.STRING)
                        jsonKeyValue = reader.nextString();
                    break;


                default: // Consume token, move on
                    reader.nextNull();
                    break;
            }
        }

        reader.endObject();
        return myObject;
    }
}
