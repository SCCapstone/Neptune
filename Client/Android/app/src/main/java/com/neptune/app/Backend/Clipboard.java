package com.neptune.app.Backend;
import android.app.Notification;
import android.content.ClipData;
import android.content.ClipDescription;
import android.content.ClipboardManager;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.net.Uri;
import android.provider.MediaStore;
import android.util.Log;

import androidx.core.content.FileProvider;

import com.google.gson.JsonObject;
import com.neptune.app.BuildConfig;
import com.neptune.app.MainActivity;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Objects;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class Clipboard {
    private static final String TAG = "Clipboard";

    public static JsonObject getClipboard() {
        ClipboardManager clipboard = (ClipboardManager) MainActivity.Context.getSystemService(Context.CLIPBOARD_SERVICE);
        if (clipboard.hasPrimaryClip() || clipboard.getPrimaryClip() != null) {
            ClipData clipData = clipboard.getPrimaryClip();
            //ClipDescription clipDescription = clipData.getDescription();
            JsonObject json = new JsonObject();
            for (int i = 0; i < clipData.getItemCount(); i++) {
                ClipData.Item item = clipData.getItemAt(i);
                String mimeType = clipData.getDescription().getMimeType(i);

                if (mimeType.equals(ClipDescription.MIMETYPE_TEXT_PLAIN)) { // Plain 'ol text
                    if (item.getText() != null) {
                        if (json.has("Text"))
                            continue; // Skip, already added

                        try {
                            String encodedText = NeptuneCrypto.convertStringToBase64(item.getText().toString()); // Text -> base64
                            json.addProperty("Text", "data:" + mimeType + ";base64, " + encodedText); // Add text
                        } catch (Exception e) {
                            Log.e(TAG, "Failed to add plain text data.");
                            e.printStackTrace();
                        }
                    }

                } else if (mimeType.equals(ClipDescription.MIMETYPE_TEXT_HTML)) { // HTML formatting data
                    if (item.getHtmlText() != null) {
                        if (json.has("HTML"))
                            continue; // Skip, already added

                        try {
                            String encodedHtml = NeptuneCrypto.convertStringToBase64(item.getHtmlText()); // Text -> base64
                            json.addProperty("HTML", "data:" + mimeType + ";base64, " + encodedHtml); // Add HTML data

                            String plainText = NeptuneCrypto.convertStringToBase64(item.getText().toString()); // Plain text -> base64
                            json.addProperty("Text", "data:text/plain;base64, " + plainText);
                        } catch (Exception e) {
                            e.printStackTrace();
                        }
                    }

                } else if (mimeType.startsWith("image/")) { // Image -> base64
                    Uri uri = item.getUri();
                    if (uri != null) {
                        if (json.has("Image") && !mimeType.endsWith("png")) // We'll override since the new data is PNG (likely better)
                            continue; // Skip, already added

                        try {
                            byte[] bytes; // Image bytes
                            try (InputStream inputStream = MainActivity.Context.getContentResolver().openInputStream(uri)) {
                                try (ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
                                    byte[] buffer = new byte[4096];
                                    int bytesRead;
                                    while ((bytesRead = inputStream.read(buffer)) != -1) {
                                        outputStream.write(buffer, 0, bytesRead); // Reads image into buffer
                                    }
                                    bytes = outputStream.toByteArray(); // Buffer to bytes
                                }
                            }

                            if (bytes != null && bytes.length > 0) {
                                String encodedData = "data:" + mimeType + ";base64, " + NeptuneCrypto.convertBytesToBase64(bytes); // Image -> base64
                                json.addProperty("Image", encodedData);
                            }
                        } catch (Exception e) {
                            Log.e(TAG, "Failed to add image data");
                            e.printStackTrace();
                        }
                    }
                }
            }
            return json;
        }

        return new JsonObject();
    }


    private static class InvalidDataString extends Exception { public InvalidDataString() { super(); } }
    private static class DataParts {
        public String mimeType;
        public String fileExtension;
        public String encoding;
        public String data;

        public DataParts(String dataString) throws InvalidDataString {
            String[] parts = dataString.split(",");
            if (parts.length != 2)
                return;
            data = parts[1].trim();

            String pattern = "^data:(.*)\\/(.*);(.*)$";
            Pattern r = Pattern.compile(pattern);
            Matcher m = r.matcher(parts[0]);

            if (m.find() && m.groupCount() == 3) {
                mimeType = m.group(1).toLowerCase();
                fileExtension = m.group(2).toLowerCase();
                encoding = m.group(3).toLowerCase();

            } else {
                String s = "";
                int i = 0;
                for (int j = 0; j <= m.groupCount(); j++) {
                    s += "\nGroup " + i + ": " + m.group(j);
                    i++;
                }
                Log.d(TAG, "Matches: " + s);
                throw new InvalidDataString();
            }
        }
    }


    /**
     * Sets the clipboard to provided text. Text must follow this format: "data:text/plain;base64, ..."
     *
     * Data must be in this format: {@code data:(mimeType);(encoding), (encoded data)}.
     * Where {@code (mimeType)} is text/plain,
     * {@code (encoding)} is either base64 or hex,
     * and {@code encoded data} is the text encoded as {@code (encoding)}.
     * @param dataString "data:text/html;base64 ..."
     */
    public static void setClipboardText(String dataString) {
        DataParts data;
        try {
            data = new DataParts(dataString);
        } catch (InvalidDataString e) {
            Log.e(TAG, "Attempt to set clipboard text using an invalid data string!");
            e.printStackTrace();
            return;
        }

        String textData;

        switch (data.encoding) {
            case "base64":  // Base64-encoded text data
                textData = NeptuneCrypto.convertBase64ToString(data.data);
                break;
            case "hex":  // Hex-encoded text data
                textData = NeptuneCrypto.convertHexToString(data.data);
                break;
            case "plain":  // Plain text
                textData = data.data;
                break;
            default:
                Log.e(TAG, "Attempt to set clipboard text using an invalid data encoding ( " + data.encoding + ")!");
                return;
        }

        ClipboardManager clipboard = (ClipboardManager) MainActivity.Context.getSystemService(Context.CLIPBOARD_SERVICE);
        ClipData clip = ClipData.newPlainText("Neptune-Server: Text", textData);
        clipboard.setPrimaryClip(clip);
    }

    /**
     * Sets the clipboard's HTML data to the provided data.
     * This must be paired with the plain text!
     *
     * Data must be in this format: {@code data:(mimeType);(encoding), (encoded data)}.
     * Where {@code (mimeType)} is a text mimetype (either text/plain or text/html),
     * {@code (encoding)} is either base64 or hex,
     * and {@code encoded data} is the text (html/text) encoded as {@code (encoding)}.
     * @param dataString "data:text/html;base64 ..."
     * @param textDataString "data:text/plain;base64 ..."
     */
    public static void setClipboardHTML(String dataString, String textDataString) {
        DataParts data;
        DataParts textData;

        try {
            data = new DataParts(dataString);
            textData = new DataParts(textDataString);
        } catch (InvalidDataString e) {
            Log.e(TAG, "Attempt to set clipboard HTML using an invalid data string!");
            e.printStackTrace();
            return;
        }

        String plainText;
        String htmlData;

        // Decode plain text
        switch (textData.encoding) {
            case "base64":  // Base64-encoded text data
                plainText = NeptuneCrypto.convertBase64ToString(textData.data);
                break;
            case "hex":  // Hex-encoded text data
                plainText = NeptuneCrypto.convertHexToString(textData.data);
                break;
            case "plain":  // Plain text
                plainText = textData.data;
                break;
            default:
                Log.e(TAG, "Attempt to set clipboard text using an invalid data encoding ( " + textData.encoding + ")!");
                return;
        }

        // Decode HTML
        if (data.encoding.equals("base64")) { // Base64-encoded HTML data
            htmlData = NeptuneCrypto.convertBase64ToString(data.data);
        } else if (data.encoding.equals("hex")) { // Hex-encoded HTML data
            htmlData = NeptuneCrypto.convertHexToString(data.data);
        } else {
            Log.e(TAG, "Attempt to set clipboard HTML using an invalid data encoding ( " + data.encoding + ")!");
            return;
        }

        ClipboardManager clipboard = (ClipboardManager) MainActivity.Context.getSystemService(Context.CLIPBOARD_SERVICE);
        ClipData clip = ClipData.newHtmlText("Neptune-Server: HTML Data", plainText, htmlData);
        clipboard.setPrimaryClip(clip);
    }

    /**
     * Adds an image to the clipboard.
     *
     * Image data must be in this format: {@code data:(mimeType);(encoding), (encoded data)}.
     * Where {@code (mimeType)} is the image mime type,
     * {@code (encoding)} is either base64 or hex,
     * and {@code encoded data} is the image data (bitmap, png, jpg) encoded as {@code (encoding)}.
     * @param imageDataString Image data string in correct format
     */
    public static void setClipboardImage(String imageDataString) {
        DataParts data;
        try {
            data = new DataParts(imageDataString);
        } catch (InvalidDataString e) {
            Log.e(TAG, "Attempt to set clipboard image using an invalid data string!");
            e.printStackTrace();
            return;
        }

        byte[] imageData;

        if (data.encoding.equals("base64")) {
            // Base64-encoded image data
            imageData = NeptuneCrypto.convertBase64ToBytes(data.data);
        } else if (data.encoding.equals("hex")) {
            // Hex-encoded image data
            imageData = NeptuneCrypto.convertHexToBytes(data.data);
        } else {
            Log.e(TAG, "Attempt to set clipboard image using an invalid data encoding ( " + data.encoding + ")!");
            return;
        }

        // Create a bitmap from the decoded image data
        Bitmap bitmap = BitmapFactory.decodeByteArray(imageData, 0, imageData.length);

        // Store
        Uri uri;
        try {
            File imageFile = new File(MainActivity.Context.getCacheDir(), "clipboard_image.tmp");
            if (!imageFile.exists()) {
                imageFile.createNewFile(); // Create file if it does not already exist
            }

            ByteArrayOutputStream bytes = new ByteArrayOutputStream();
            bitmap.compress(Bitmap.CompressFormat.JPEG, 100, bytes); // Compress image
            String path = MediaStore.Images.Media.insertImage(MainActivity.Context.getContentResolver(), bitmap,
                    "Neptune clipboard image",
                    "Clipboard image from server");
            uri = Uri.parse(path);
            bytes.close();

            if (uri != null) {
                // Grant permission to access the content URI to other apps
                int flags = Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION;
                MainActivity.Context.grantUriPermission(BuildConfig.APPLICATION_ID + ".provider", uri, flags);

                ClipData clipData = ClipData.newUri(MainActivity.Context.getContentResolver(), "Neptune-Server: Image", uri);
                ClipboardManager clipboard = (ClipboardManager) MainActivity.Context.getSystemService(Context.CLIPBOARD_SERVICE);
                clipboard.setPrimaryClip(clipData);
            }

            /*FileOutputStream outputStream = new FileOutputStream(imageFile);
            bitmap.compress(Bitmap.CompressFormat.JPEG, 100, outputStream); // Compress image
            outputStream.close();
            uri = FileProvider.getUriForFile(MainActivity.Context,"com.neptune.app.provider", imageFile);

            if (uri != null) {
                // Grant permission to access the content URI to other apps
                int flags = Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION;
                MainActivity.Context.grantUriPermission("com.neptune.app.provider", uri, flags);



                ContentResolver theContent = MainActivity.Context.getContentResolver();
                ContentValues values = new ContentValues(3);
                values.put(MediaStore.Images.Media.MIME_TYPE, "image/jpeg");
                values.put(MediaStore.Images.Media.DISPLAY_NAME, "clipboard_image.jpg");
                values.put(MediaStore.Images.Media.DATA, uri.toString());

                Uri imageUri = theContent.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values);
                ClipData clipData = ClipData.newUri(MainActivity.Context.getContentResolver(), "Neptune-Server: Image", imageUri);
                ClipboardManager clipboard = (ClipboardManager) MainActivity.Context.getSystemService(Context.CLIPBOARD_SERVICE);
                clipboard.setPrimaryClip(clipData);
            }*/
        } catch (IOException e) {
            Log.e(TAG, "Unable to set clipboard image due to IOException.");
            e.printStackTrace();
        }
    }


    /**
     * Sets the clipboard to the Json data provided. Can have three keys: "Image", "HTML", and "Text".
     * If there is HTML data there MUST be text data as well.
     *
     * Each key must follow the data format.
     *
     * Data must be in this format: {@code data:(mimeType);(encoding), (encoded data)}.
     * Where {@code (mimeType)} is the data mimetype,
     * {@code (encoding)} is either base64 or hex,
     * and {@code encoded data} is the data encoded as {@code (encoding)}.
     * @param clipboardData Data to set the clipboard to.
     */
    public static boolean setClipboard(JsonObject clipboardData) {
        boolean noErrors = true;

        if (clipboardData.has("Image")) {
            try {
                setClipboardImage(clipboardData.get("Image").getAsString());
            } catch (Exception e) {
                e.printStackTrace();
                noErrors = false;
            }
        }

        if (clipboardData.has("HTML") && clipboardData.has("Text")) {
            try {
                setClipboardHTML(clipboardData.get("HTML").getAsString(), clipboardData.get("Text").getAsString());
            } catch (Exception ignored) {
                noErrors = false;
            }
        }

        if (clipboardData.has("Text")) {
            try {
                setClipboardText(clipboardData.get("Text").getAsString());
            } catch (Exception ignored) {
                noErrors = false;
            }
        }

        return noErrors;
    }
}