package com.neptune.app.Backend;

import android.os.StrictMode;
import android.util.Base64;
import android.util.Log;

import androidx.annotation.NonNull;

import com.google.gson.JsonObject;
import com.google.gson.JsonParseException;
import com.google.gson.JsonParser;
import com.neptune.app.MainActivity;

import org.java_websocket.handshake.ServerHandshake;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.BufferedOutputStream;
import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.math.BigInteger;
import java.net.HttpURLConnection;
import java.net.MalformedURLException;
import java.net.ServerSocket;
import java.net.Socket;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.InvalidAlgorithmParameterException;
import java.security.InvalidKeyException;
import java.security.Key;
import java.security.KeyFactory;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.NoSuchProviderException;
import java.security.PublicKey;
import java.security.SecureRandom;
import java.security.spec.InvalidKeySpecException;
import java.text.DateFormat;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.TimeUnit;

import java.net.URI;
import java.net.URISyntaxException;
import org.java_websocket.client.WebSocketClient;

import javax.crypto.KeyAgreement;
import javax.crypto.NoSuchPaddingException;
import javax.crypto.SecretKey;
import javax.crypto.interfaces.DHPrivateKey;
import javax.crypto.interfaces.DHPublicKey;
import javax.crypto.spec.DHParameterSpec;
import javax.crypto.spec.DHPublicKeySpec;
import javax.crypto.spec.SecretKeySpec;

import at.favre.lib.crypto.HKDF;
import kotlin.NotImplementedError;

public class ConnectionManager {
    private boolean hasNegotiated;
    private Date lastCommunicatedTime;
    // protected AsyncHttpClient AsyncHttpClient; // Eh maybe not .. but probably

    private IPAddress IPAddress;
    private Server Server;

    private WebSocketClient webSocketClient;

    /**
     * This is the connection initiation Id, used to identify the connection
     */
    private String conInitUUID;
    private String socketUUID; // socketId, used for POST requests and socket connection

    private SecretKey sharedSecret;
    private NeptuneCrypto.CipherData cipherData;

    public ConnectionManager(IPAddress ipAddress, Server parent) {
        this.IPAddress = ipAddress;
        this.Server = parent;
        Log.d("Connection-Manager", "Setup for " + ipAddress.toString());
    }

    // This sends a POST request
    // apiURL is the 'api' or command you're calling, request data the ... data, and callback ... nothing for now
    public JsonObject sendRequest(String apiURL, JsonObject requestData) throws JsonParseException, MalformedURLException { //, Callable<Void> callback) {
        String response = "{}";

        String packet = "{ \"conInitUUID\": \"" + this.conInitUUID + "\", \"command\": \"" + apiURL + "\" }";
        JsonObject obj = JsonParser.parseString(packet).getAsJsonObject();
        String data = requestData.toString();
        if (this.sharedSecret != null) {
            try {
                NeptuneCrypto.encrypt(data, this.sharedSecret, null, this.cipherData);
            } catch (InvalidKeyException e) {
                e.printStackTrace();
            } catch (InvalidAlgorithmParameterException e) {
                e.printStackTrace();
            }
        }
        obj.addProperty("data", data);

        response = sendHTTPPostRequest(new URL("http://" + this.IPAddress.toString() + "/api/v1/server/socket/" + this.socketUUID + "/http"), obj.toString());

        JsonObject jsonResponse = JsonParser.parseString(response).getAsJsonObject();
        if (jsonResponse.has("data")) {
            String responseData = jsonResponse.get("data").getAsString();
            if (NeptuneCrypto.isEncrypted(responseData)) {
                try {
                    responseData = NeptuneCrypto.decrypt(responseData, this.sharedSecret);
                } catch (NoSuchPaddingException e) {
                    e.printStackTrace();
                    data = "{}";
                } catch (NoSuchAlgorithmException e) {
                    e.printStackTrace();
                    data = "{}";
                }
            }
            jsonResponse.remove("data");
            jsonResponse.add("data", JsonParser.parseString(responseData).getAsJsonObject());
        }

        return jsonResponse;
    }
    public void sendRequestAsync(String apiURL, JsonObject requestData) {
        Thread thread = new Thread(new Runnable(){
            @Override
            public void run(){
                try {
                    sendRequest(apiURL, requestData);
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }
        });
        thread.start();
        thread.setName(Server.serverId + " - HTTP POST request runner");
    }

    public String sendHTTPPostRequest(URL url, String data) {
        Log.d("Connection-Manager", "Sending request to: " + url);
        try {
            HttpURLConnection connection = null;
            connection = (HttpURLConnection)url.openConnection();
            connection.setRequestMethod("POST");
            connection.setRequestProperty("Content-Type", "application/json");
            connection.setRequestProperty("Accept", "application/json");
            connection.setDoOutput(true);
            connection.setConnectTimeout(10000);
            connection.setReadTimeout(12500);

            // Write the data
            Log.d("Connection-Manager", "Data to be sent: " + data);
            //try(OutputStream stream = connectionA.getOutputStream()) {
            //    byte[] input = data.getBytes(StandardCharsets.UTF_8);
            //    stream.write(input, 0, input.length);
            //}

            OutputStream out = new BufferedOutputStream(connection.getOutputStream());
            BufferedWriter writer = new BufferedWriter(new OutputStreamWriter(out, "UTF-8"));
            writer.write(data);
            writer.flush();
            writer.close();
            out.close();


            int responseCode = connection.getResponseCode();

            StringBuilder response = new StringBuilder();
            try(BufferedReader br = new BufferedReader(new InputStreamReader(connection.getInputStream(), StandardCharsets.UTF_8))) {
                String responseLine = null;
                while ((responseLine = br.readLine()) != null) {
                    response.append(responseLine.trim());
                }
            }
            connection.disconnect();

            Log.d("Connection-Manager", "Got code: " + responseCode + "\nReceived response: " + response.toString());
            this.lastCommunicatedTime = new Date();
            return response.toString();
        } catch (IOException e) {
            Log.d("Connection-Manager", "Server does not exist, or we cannot not connect");
            e.printStackTrace();
        }
        return "{}";
    }

    public void sendHTTPPostRequestAsync(URL apiURL, String data) {
        Thread thread = new Thread(new Runnable(){
            @Override
            public void run(){
                sendHTTPPostRequest(apiURL, data);
            }
        });
        thread.start();
        thread.setName(Server.serverId + " - HTTP POST request runner");
    }
    public void sendHTTPPostRequestAsync(String apiURL, String data) throws MalformedURLException {
        sendHTTPPostRequestAsync(new URL("http://" + IPAddress.toString() + "/api/v1/server/socket/" + socketUUID + "/http"), data);
    }


    public boolean initiateConnectionSync() throws FailedToPair {
        // Step 1: send
        /*
        {
            "acceptedKeyGroups": [
                14,
                16,
                17
            ],
            "acceptedHashTypes": [
                "chacha20-poly1305",
                "aes-256-gcm",
                "aes-192-gcm"
            ],
            "acceptedCrypto": [
                "sha256",
                "sha512"
            ],
            "useDynamicSalt": false
        }
         */
        int SDK_INT = android.os.Build.VERSION.SDK_INT;
        if (SDK_INT > 8)
        {
            StrictMode.ThreadPolicy policy = new StrictMode.ThreadPolicy.Builder().permitAll().build();
            StrictMode.setThreadPolicy(policy);
            //your codes here
            try {
                URL url = new URL("http://" + this.IPAddress.toString() + "/api/v1/server/initiateConnection");
                Log.d("Connection-Manager", "Initiating connection: http://" + this.IPAddress.toString() + "/api/v1/server/initiateConnection");
                HttpURLConnection connection = (HttpURLConnection)url.openConnection();
                connection.setRequestMethod("POST");
                connection.setRequestProperty("Content-Type", "application/json");
                connection.setRequestProperty("Accept", "application/json");
                connection.setDoOutput(true);

                String connectionParameters = "{\"supportedKeyGroups\": [\"modp16\"],\"supportedCiphers\": [\"aes-128-gcm\"],\"supportedHashAlgorithm\": [\"sha256\"], \"useDynamicSalt\": false }";

                try(OutputStream stream = connection.getOutputStream()) { // dump the string into output
                    byte[] input = connectionParameters.getBytes(StandardCharsets.UTF_8);
                    stream.write(input, 0, input.length);
                }
                Log.d("Connection-Manager", "reading response...");
                StringBuilder response = new StringBuilder();
                try(BufferedReader br = new BufferedReader(new InputStreamReader(connection.getInputStream(), StandardCharsets.UTF_8))) {
                    String responseLine = null;
                    while ((responseLine = br.readLine()) != null) {
                        response.append(responseLine.trim());
                    }
                }
                connection.disconnect();

                Log.d("Connection-Manager", "Received response: " + response.toString());

                JSONObject serverResponse = new JSONObject(response.toString());
                if (serverResponse.has("error"))
                    throw new FailedToPair(serverResponse.getString("error"));


                // We need g1, p1, a1, and conInitUUID (all in b64, except uuid)
                BigInteger g1 = new BigInteger(1, NeptuneCrypto.convertBase64ToBytes(serverResponse.getString("g1"))); //new BigInteger("2"); // I don't make the rules
                BigInteger p1 = new BigInteger(1, NeptuneCrypto.convertBase64ToBytes(serverResponse.getString("p1"))); //new BigInteger(NeptuneCrypto.convertBase64ToString(serverResponse.getString("p1")));
                BigInteger a1 = new BigInteger(1, NeptuneCrypto.convertBase64ToBytes(serverResponse.getString("a1"))); //new BigInteger(NeptuneCrypto.convertBase64ToString(serverResponse.getString("a1")));

                String selectedCipher = "aes-128-gcm";
                if (serverResponse.has("selectedCipher"))
                    selectedCipher = serverResponse.getString("selectedCipher");
                String selectedHashAlgorithm = "sha256";
                if (serverResponse.has("selectedHashAlgorithm"))
                    selectedHashAlgorithm = serverResponse.getString("selectedHashAlgorithm");

                this.conInitUUID = serverResponse.getString("conInitUUID");
                DHPublicKey alicePublic = (DHPublicKey) KeyFactory.getInstance("DH").generatePublic(new DHPublicKeySpec(a1, p1, g1));

                // generate response (input for step2)
                DHParameterSpec dhParams = new DHParameterSpec(p1, g1);
                KeyAgreement keyAgreement = KeyAgreement.getInstance("DH");
                KeyPairGenerator keyGen = KeyPairGenerator.getInstance("DH");
                keyGen.initialize(dhParams);
                KeyPair keyPair = keyGen.generateKeyPair();
                DHPublicKey bobPublic = (DHPublicKey)keyPair.getPublic();
//                Log.d("Connection-Manager", "bob public: " + NeptuneCrypto.convertBytesToHex(bobPublic.getY().toByteArray()));

                keyAgreement.init(keyPair.getPrivate());
                keyAgreement.doPhase(alicePublic, true);

                byte[] dhSecret = keyAgreement.generateSecret();
                this.cipherData = new NeptuneCrypto.CipherData(selectedCipher, selectedHashAlgorithm);
                NeptuneCrypto.HKDFOptions options = new NeptuneCrypto.HKDFOptions(this.cipherData);
                options.keyLength = 32; // We want the shared key to be 32byte
                AESKey sharedAESKey = NeptuneCrypto.HKDF(dhSecret, "mySalt1234", options);
                this.sharedSecret = sharedAESKey.getKey();


                String chkMsg = NeptuneCrypto.convertStringToBase64(NeptuneCrypto.randomString(64)); // idk why b64

//                Log.d("Connection-Manager", "bob secret: " + NeptuneCrypto.convertBytesToHex(((DHPrivateKey)keyPair.getPrivate()).getX().toByteArray()));
//                Log.d("Connection-Manager", "DH secret: " + NeptuneCrypto.convertBytesToHex(dhSecret));
//                Log.d("Connection-Manager", "shared secret: " + NeptuneCrypto.convertBytesToHex(this.sharedSecret.getEncoded()));

                // hash
                MessageDigest digest = MessageDigest.getInstance((selectedHashAlgorithm.equalsIgnoreCase("sha512"))? "SHA-512" : "SHA-256");
                byte[] chkMsgEncodedHash = digest.digest(chkMsg.getBytes(StandardCharsets.UTF_8));
                String chkMsgHash = NeptuneCrypto.convertBytesToHex(chkMsgEncodedHash);

                // Encrypted
                String clientIdString = NeptuneCrypto.encrypt(MainActivity.ClientConfig.clientId.toString(), this.sharedSecret, null, this.cipherData);
                boolean newPair = true;
                if (this.Server.pairKey != null) {
                    if (!this.Server.pairKey.isEmpty()) {
                        newPair = false;
                        AESKey sharedAESKeyWithPairKey = NeptuneCrypto.HKDF(dhSecret, this.Server.pairKey, options);
                        this.sharedSecret = sharedAESKeyWithPairKey.getKey();
                    }
                }
                String chkMsgEncrypted = NeptuneCrypto.encrypt(chkMsg, this.sharedSecret, null, this.cipherData);
                String chkMyself = NeptuneCrypto.decrypt(chkMsgEncrypted, this.sharedSecret);
                if (!chkMyself.equalsIgnoreCase(chkMsg))
                    throw new InvalidKeyException(); // Couldn't encrypt decrypt

                // the response.. needs b1, newPair, chkMsg, chkMsgHash, chkMsgHashFunction
                String publicKey = NeptuneCrypto.convertBytesToBase64(bobPublic.getY().toByteArray()); // this might be wrong
                String step2 = "{\"b1\": \"" + publicKey + "\",\"newPair\": " + newPair + ", \"chkMsg\": \"" + chkMsgEncrypted + "\", \"chkMsgHash\": \"" + chkMsgHash + "\", \"chkMsgHashFunction\": \"sha256\", \"clientId\": \"" + clientIdString + "\"}";
                Log.d("Connection-Manager", "Sending step2 data: " + step2);

                // Send step2
                URL url2 = new URL("http://" + this.IPAddress.toString() + "/api/v1/server/initiateConnection/" + this.conInitUUID);
                Log.d("Connection-Manager", "Initiating connection: http://" + this.IPAddress.toString() + "/api/v1/server/initiateConnection/" + this.conInitUUID);
                HttpURLConnection connection2 = (HttpURLConnection)url2.openConnection();
                connection2.setRequestMethod("POST");
                connection2.setRequestProperty("Content-Type", "application/json");
                connection2.setRequestProperty("Accept", "application/json");
                connection2.setDoOutput(true);

                try(OutputStream stream2 = connection2.getOutputStream()) { // dump the string into output
                    byte[] input = step2.getBytes(StandardCharsets.UTF_8);
                    stream2.write(input, 0, input.length);
                }

                int code = connection2.getResponseCode();
                if (code == 400 || code == 408 || code == 401 || code == 403) {
                    StringBuilder response2 = new StringBuilder();
                    try(BufferedReader br2 = new BufferedReader(new InputStreamReader(connection2.getErrorStream(), StandardCharsets.UTF_8))) {
                        String responseLine2 = null;
                        while ((responseLine2 = br2.readLine()) != null) {
                            response2.append(responseLine2.trim());
                        }
                    }

                    JSONObject serverResponse2 = new JSONObject(response2.toString());
                    if (serverResponse2.has("error"))
                        throw new FailedToPair(serverResponse2.getString("error"));
                    else
                        throw new FailedToPair("Server returned code " + code);
                }

                StringBuilder response2 = new StringBuilder();
                try(BufferedReader br2 = new BufferedReader(new InputStreamReader(connection2.getInputStream(), StandardCharsets.UTF_8))) {
                    String responseLine2 = null;
                    while ((responseLine2 = br2.readLine()) != null) {
                        response2.append(responseLine2.trim());
                    }
                }
                connection2.disconnect();
                String data = response2.toString();

                if (NeptuneCrypto.isEncrypted(data)) {
                    data = NeptuneCrypto.decrypt(data, this.sharedSecret);
                }

                Log.d("Connection-Manager", "Received response: " + data);

                JSONObject serverResponse2 = new JSONObject(data);


                // validate confMsg
                this.socketUUID = serverResponse2.getString("socketUUID");

                this.hasNegotiated = true;

                // at some point

                Log.d("Connection-Manager", "Connection complete! SocketUUID: " + this.socketUUID);

                if (this.Server.pairId == null) {
                    this.pair();
                }

                // we good
                return true;
            } catch (IOException e) {
                // damn
                e.printStackTrace();
                throw new FailedToPair("No response from server.");
            } catch (JSONException e) {
                // damn, shouldn't happen tho
                e.printStackTrace();
                throw new FailedToPair("Invalid server response.");
            } catch (NumberFormatException e) {
                // damn, shouldn't happen tho
                e.printStackTrace();
                throw new FailedToPair("Number format exception.");
            } catch (InvalidKeyException e) {
                e.printStackTrace();
                throw new FailedToPair("Unable to generate shared key.");
            } catch (NoSuchPaddingException | InvalidKeySpecException | InvalidAlgorithmParameterException | NoSuchAlgorithmException e) {
                e.printStackTrace();
                throw new FailedToPair("Invalid cipher selected.");
            }

        }
        return false;
    }


    // Creates the web socket for the client
    public void createWebSocketClient() {
        URI uri;
        try {
            //  Connect to socket
            uri = new URI("/api/v1/server/socket/"+this.socketUUID);
        }
        catch (URISyntaxException e) {
            e.printStackTrace();
            return;
        }

         webSocketClient = new WebSocketClient(uri) {
            @Override
            public void onOpen(ServerHandshake handshakedata) {
                System.out.println("Connected");
            }

            @Override
            public void onMessage(String message) {
                System.out.println(message);
            }

            @Override
            public void onClose(int code, String reason, boolean remote) {
                System.out.println("Disconnected");
            }

            @Override
            public void onError(Exception ex) {
                ex.printStackTrace();
            }
        };

        //webSocketClient.connect();
    }

    public void sendWebSocketInfo (String apiURL, JsonObject requestData) throws MalformedURLException {
        sendRequest(apiURL, requestData);
    }

    public void initiateConnection() {
        Thread thread = new Thread(() -> {
            try {
                initiateConnectionSync();
            } catch (FailedToPair e) {
                e.printStackTrace();
            }
        });
        thread.start();
        thread.setName(Server.serverId + " - Initiation runner");

        createWebSocketClient();
        webSocketClient.connect();

    }

    /**
     * Pings the server, returns the RTT. -1 if failed/not connected.
     * @return Round trip ping time, or -1 if failure.
     */
    public double ping() {
        try {
            if (this.hasNegotiated == false)
                return -1;

            JsonObject data = new JsonObject();
            SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.UK);
            String formattedDate = sdf.format(new Date());
            data.addProperty("timestamp", formattedDate);
            JsonObject response = this.sendRequest("/api/v1/server/ping", data);

            if (response.has("command") && response.has("data")) {
                if (!response.get("command").getAsString().equalsIgnoreCase("/api/v1/client/pong"))
                    return -1;
                JsonObject responseData = response.get("data").getAsJsonObject();
                if (responseData.has("receivedAt")) {
                    String timeStamp = responseData.get("receivedAt").getAsString();
                    DateFormat df1 = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");
                    Date serverTimestamp = df1.parse(timeStamp);
                    long diffInMilliseconds = Math.abs(serverTimestamp.getTime() - new Date().getTime());
                    //long diff = TimeUnit.DAYS.convert(diffInMilliseconds, TimeUnit.MILLISECONDS);
                    Log.d("ConnectionManager-" + this.Server.serverId, "Server " + this.Server.friendlyName + " ping: " + diffInMilliseconds + "ms");
                    this.Server.sendBatteryInfo();
                    return diffInMilliseconds;
                }
            }
        } catch (MalformedURLException | ParseException e) {
            e.printStackTrace();
            return -1;
        }

        return -1;
    }

    public void destroy(boolean force) {

    }

    public void setIPAddress(IPAddress ipAddress) {
        IPAddress = ipAddress;
    }

    public void setIPAddress(String ip, int port) {
        IPAddress.setIPAddress(ip);
        IPAddress.setPort(port);
    }

    public void setIPAddress(String ip) {
        IPAddress.setIPAddress(ip);
    }

    public IPAddress getIPAddress() {
        return IPAddress;
    }

    public Date getLastCommunicatedTime() {
        return lastCommunicatedTime;
    }

    public boolean getHasNegotiated() {
        return this.hasNegotiated;
    }

    public void pair() throws FailedToPair {
        Log.i("ConnectionManager", "Pairing...");
        try {
            JsonObject data = new JsonObject();
            data.addProperty("clientId", MainActivity.ClientConfig.clientId.toString());
            data.addProperty("friendlyName", MainActivity.ClientConfig.friendlyName);

            JsonObject response = sendRequest("/api/v1/server/newPairRequest", data);
            if (!response.has("data"))
                throw new FailedToPair("Invalid server response: no data.");

            response = response.get("data").getAsJsonObject();
            if (response == null) {
                this.Server.delete();
                throw new FailedToPair("Null response");
            }
            if (response.has("error")) {
                throw new FailedToPair(response.get("errorMessage").toString());
            }
            if (!response.has("serverId") || !response.has("pairId") || !response.has("pairKey")) {
                this.Server.delete();
                throw new FailedToPair("Invalid server response");
            }

            this.Server.serverId = UUID.fromString(response.get("serverId").getAsString());
            if (response.has("friendlyName"))
                this.Server.friendlyName = response.get("friendlyName").getAsString();

            this.Server.pairId = UUID.fromString(response.get("pairId").getAsString());
            this.Server.pairKey = response.get("pairKey").getAsString();

            this.Server.dateAdded = new Date();

            this.Server.updateConfigName();

            Log.i("Connection-Manager", "pair: successful!");

        } catch (MalformedURLException e) {
            e.printStackTrace();
        } catch (Exception e) {
            e.printStackTrace();
            throw new FailedToPair(e.getMessage());
        }
    }

    public class FailedToPair extends Exception {
        FailedToPair() {
            super("Unknown error while attempting to pair.");
        }
        FailedToPair(String error) {
            super(error);
        }
    }
}