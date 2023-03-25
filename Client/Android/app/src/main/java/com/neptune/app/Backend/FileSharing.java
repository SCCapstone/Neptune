package com.neptune.app.Backend;

import java.io.*;
import java.net.*;

public class FileSharing {

    // Downloads the File
    public void downloadFunction(String fileUUID, String authenticationCode) {
        try {
            URL url = new URL("/api/v1/server/socket/socketUUID/filesharing/{{fileUUID}}");
            HttpURLConnection connection = (HttpURLConnection) url.openConnection();
            connection.setRequestMethod("POST");
            connection.setRequestProperty("Content-Type", "application/json");
            connection.setDoOutput(true);

            String postData = "{ \"authenticationCode\": \"" + authenticationCode + "\" }";
            OutputStream os = connection.getOutputStream();
            os.write(postData.getBytes());
            os.flush();

            int responseCode = connection.getResponseCode();
            if (responseCode == HttpURLConnection.HTTP_OK) {
                String fileName = "";
                String disposition = connection.getHeaderField("Content-Disposition");
                String contentType = connection.getContentType();
                int contentLength = connection.getContentLength();

                if (disposition != null) {
                    int index = disposition.indexOf("filename=");
                    if (index > 0) {
                        fileName = disposition.substring(index + 10, disposition.length() - 1);
                    }
                } else {
                    fileName = fileUUID;
                }

                InputStream is = connection.getInputStream();
                FileOutputStream fos = new FileOutputStream(fileName);

                int bytesRead = -1;
                byte[] buffer = new byte[4096];
                while ((bytesRead = is.read(buffer)) != -1) {
                    fos.write(buffer, 0, bytesRead);
                }

                fos.close();
                is.close();
                System.out.println("File downloaded successfully.");
            } else {
                System.out.println("Server returned HTTP response code: " + responseCode);
            }

            connection.disconnect();
        } catch (MalformedURLException e) {
            e.printStackTrace();
        } catch (IOException e) {
            e.printStackTrace();
        }
    }
}

