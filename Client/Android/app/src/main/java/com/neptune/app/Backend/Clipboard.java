// import android.content.ClipData;
// import android.content.ClipDescription;
// import android.content.ClipboardManager;
// import android.content.Context;
// import android.net.Uri;
// import android.util.Base64;
// import com.google.gson.Gson;
// import com.google.gson.JsonObject;

// public void getClipboardDataAsJson() {
//     ClipboardManager clipboard = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
//     if (clipboard.hasPrimaryClip()) {
//         ClipData clipData = clipboard.getPrimaryClip();
//         ClipDescription clipDescription = clipData.getDescription();
//         JsonObject json = new JsonObject();
//         for (int i = 0; i < clipData.getItemCount(); i++) {
//             ClipData.Item item = clipData.getItemAt(i);
//             String mimeType = clipData.getDescription().getMimeType(i);
//             if (mimeType.startsWith("image/")) {
//                 Uri uri = item.getUri();
//                 if (uri != null) {
//                     try {
//                         InputStream inputStream = getContentResolver().openInputStream(uri);
//                         byte[] bytes = new byte[inputStream.available()];
//                         inputStream.read(bytes);
//                         String encodedData = Base64.encodeToString(bytes, Base64.DEFAULT);
//                         json.addProperty(mimeType, encodedData);
//                     } catch (Exception e) {
//                         e.printStackTrace();
//                     }
//                 }
//             } else if (mimeType.equals(ClipDescription.MIMETYPE_TEXT_PLAIN)) {
//                 if (item.getText() != null) {
//                     try {
//                         String encodedText = Base64.encodeToString(item.getText().toString().getBytes(), Base64.DEFAULT);
//                         json.addProperty(mimeType, encodedText);
//                     } catch (Exception e) {
//                         e.printStackTrace();
//                     }
//                 }
//             } else if (mimeType.equals(ClipDescription.MIMETYPE_TEXT_HTML)) {
//                 if (item.getHtmlText() != null) {
//                     try {
//                         String encodedHtml = Base64.encodeToString(item.getHtmlText().getBytes(), Base64.DEFAULT);
//                         json.addProperty(mimeType, encodedHtml);
//                     } catch (Exception e) {
//                         e.printStackTrace();
//                     }
//                 }
//             } else if (mimeType.equals("text/rtf")) {
//                 if (item.getUri() != null) {
//                     try {
//                         InputStream inputStream = getContentResolver().openInputStream(item.getUri());
//                         byte[] bytes = new byte[inputStream.available()];
//                         inputStream.read(bytes);
//                         String encodedData = Base64.encodeToString(bytes, Base64.DEFAULT);
//                         json.addProperty(mimeType, encodedData);
//                     } catch (Exception e) {
//                         e.printStackTrace();
//                     }
//                 }
//             }
//         }
//         Gson gson = new Gson();
//         String jsonStr = gson.toJson(json);
//         // do something with jsonStr
//     }
// }