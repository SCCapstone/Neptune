package com.neptune.app.Backend.Structs;

import androidx.annotation.NonNull;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParseException;
import com.google.gson.JsonPrimitive;
import com.neptune.app.Backend.Exceptions.InvalidJsonDataType;

public class APIDataPackage {
    // Endpoint
    public String command;
    // Packet data
    public JsonElement dataElement;
    // Packet data type (array, object, primitive, etc)
    private DataType dataType;

    public APIDataPackage(JsonObject packet) {
        if (packet.has("command"))
            this.command = packet.get("command").getAsString();
        if (packet.has("data")) {
            dataElement = packet.get("data");
            if (dataElement.isJsonArray()) {
                dataType = DataType.ARRAY;
            } else if (dataElement.isJsonObject()) {
                dataType = DataType.OBJECT;
            } else if (dataElement.isJsonPrimitive()) {
                JsonPrimitive jsonPrimitive = dataElement.getAsJsonPrimitive();
                if (jsonPrimitive.isString())
                    dataType = DataType.STRING;
                else if (jsonPrimitive.isNumber())
                    dataType = DataType.NUMBER;
                else if (jsonPrimitive.isBoolean())
                    dataType = DataType.BOOLEAN;
                else {
                    dataType = DataType.NULL;
                    throw new JsonParseException("Data is unknown Json primitive.");
                }
            } else {
                dataType = DataType.JSON_ELEMENT;
                throw new JsonParseException("Data is not a Json array, object or primitive.");
            }
        }
    }

    /**
     * Gets the original packet, with the command and data untouched.
     * @return Data packet {command, data}
     */
    public JsonObject getOriginalPacket() {
        JsonObject packet = new JsonObject();
        packet.addProperty("command", command);
        switch (dataType) {
            case OBJECT:
            case ARRAY:
            case JSON_ELEMENT:
                packet.add("data", dataElement);
                break;

            case NUMBER:
                packet.addProperty("data", dataElement.getAsNumber());
                break;
            case STRING:
                packet.addProperty("data", dataElement.getAsString());
                break;
            case BOOLEAN:
                packet.addProperty("data", dataElement.getAsBoolean());
                break;
        }
        return packet;
    }

    /**
     * Get which JsonElement type "data" is.
     * @return JsonElement type of "data"
     */
    public DataType getType() {
        return this.dataType;
    }

    /**
     * Gets packet's data as a JsonObject.
     * @return Data object.
     * @throws InvalidJsonDataType Data is not a JsonObject.
     */
    public JsonObject jsonObject() throws InvalidJsonDataType {
        if (isJsonObject())
            return this.dataElement.getAsJsonObject();
        throw new InvalidJsonDataType("Data is not a Json object.");
    }

    /**
     * Gets packet's data as a JsonArray.
     * @return Data array.
     * @throws InvalidJsonDataType Data is not an array.
     */
    public JsonArray jsonArray() throws InvalidJsonDataType {
        if (isJsonArray())
            return this.dataElement.getAsJsonArray();
        throw new InvalidJsonDataType("Data is not a Json array.");
    }

    /**
     * Gets packet's data as a string.
     * @return Data string.
     * @throws InvalidJsonDataType Data is not a string.
     */
    public String asString() throws InvalidJsonDataType {
        if (isString())
            return this.dataElement.getAsString();
        throw new InvalidJsonDataType("Data is not a Json string.");
    }

    /**
     * Gets packet's data as a number.
     * @return Data number.
     * @throws InvalidJsonDataType Data is not a number.
     */
    public Number asNumber() throws InvalidJsonDataType {
        if (isNumber())
            return this.dataElement.getAsNumber();
        throw new InvalidJsonDataType("Data is not a Json number.");
    }

    /**
     * Gets packet's data as a boolean.
     * @return Data boolean.
     * @throws InvalidJsonDataType Data is not a boolean.
     */
    public boolean asBoolean() throws InvalidJsonDataType {
        if (isBoolean())
            return this.dataElement.getAsBoolean();
        throw new InvalidJsonDataType("Data is not a Json boolean.");
    }

    @NonNull
    @Override
    public String toString() {
        return this.getOriginalPacket().toString();
    }

    /**
     * Data type is JsonObject
     */
    public boolean isJsonObject() {
        return dataType == DataType.OBJECT;
    }

    /**
     * Data type is JsonArray
     */
    public boolean isJsonArray() {
        return dataType == DataType.ARRAY;
    }

    /**
     * Data type is string
     */
    public boolean isString() {
        return dataType == DataType.STRING;
    }

    /**
     * Data type is number
     */
    public boolean isNumber() {
        return dataType == DataType.NUMBER;
    }

    /**
     * Data type is boolean
     */
    public boolean isBoolean() {
        return dataType == DataType.BOOLEAN;
    }

    enum DataType {
        NULL,
        JSON_ELEMENT,
        OBJECT,
        ARRAY,
        BOOLEAN,
        STRING,
        NUMBER
    }
}
