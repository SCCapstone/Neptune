package com.neptune.app.Backend;

import android.os.StrictMode;
import android.util.Base64;
import android.util.Log;

import androidx.annotation.NonNull;

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
import java.util.Date;
import java.util.concurrent.Callable;

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
    public JSONObject sendRequest(String apiURL, JSONObject requestData) throws JSONException, MalformedURLException { //, Callable<Void> callback) {
        String response = "{}";

        String packet = "{ \"conInitUUID\": \"" + this.conInitUUID + "\", \"command\": \"" + apiURL + "\" }";
        JSONObject obj = new JSONObject(packet);
        obj.put("data", requestData.toString());

        response = sendHTTPPostRequest(new URL("http://" + this.IPAddress.toString() + "/api/v1/server/socket/" + this.socketUUID + "/http"), obj.toString());

        return new JSONObject(response);
    }
    public void sendRequestAsync(String apiURL, JSONObject requestData) throws JSONException, MalformedURLException {
        Thread thread = new Thread(new Runnable(){
            @Override
            public void run(){
                try {
                    sendRequest(apiURL, requestData);
                } catch (JSONException e) {
                    e.printStackTrace();
                } catch (MalformedURLException e) {
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


    public boolean initiateConnectionSync() {
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
                URL url = new URL("http://" + this.IPAddress.toString() + "/api/v1/server/newSocketConnection");
                Log.d("Connection-Manager", "Initiating connection: http://" + this.IPAddress.toString() + "/api/v1/server/newSocketConnection");
                HttpURLConnection connection = (HttpURLConnection)url.openConnection();
                connection.setRequestMethod("POST");
                connection.setRequestProperty("Content-Type", "application/json");
                connection.setRequestProperty("Accept", "application/json");
                connection.setDoOutput(true);

                String connectionParameters = "{\"acceptedKeyGroups\": [14,16,17],\"acceptedCrypto\": [\"aes-128-gcm\"],\"acceptedHashTypes\": [\"sha256\"], \"useDynamicSalt\": false }";

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

                // We need g1, p1, a1, and conInitUUID (all in b64, except uuid)
                BigInteger g1 = new BigInteger(1, NeptuneCrypto.convertBase64ToBytes(serverResponse.getString("g1"))); //new BigInteger("2"); // I don't make the rules
                BigInteger p1 = new BigInteger(1, NeptuneCrypto.convertBase64ToBytes(serverResponse.getString("p1"))); //new BigInteger(NeptuneCrypto.convertBase64ToString(serverResponse.getString("p1")));
                BigInteger a1 = new BigInteger(1, NeptuneCrypto.convertBase64ToBytes(serverResponse.getString("a1"))); //new BigInteger(NeptuneCrypto.convertBase64ToString(serverResponse.getString("a1")));

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
                this.cipherData = new NeptuneCrypto.CipherData("aes-128-gcm", "sha256");
                NeptuneCrypto.HKDFOptions options = new NeptuneCrypto.HKDFOptions(this.cipherData);
                options.keyLength = 32; // We want the shared key to be 32byte
                AESKey sharedAESKey = NeptuneCrypto.HKDF(dhSecret, "mySalt1234", options);
                this.sharedSecret = sharedAESKey.getKey();


                String chkMsg = NeptuneCrypto.convertStringToBase64(NeptuneCrypto.randomString(64)); // idk why b64

//                Log.d("Connection-Manager", "bob secret: " + NeptuneCrypto.convertBytesToHex(((DHPrivateKey)keyPair.getPrivate()).getX().toByteArray()));
//                Log.d("Connection-Manager", "DH secret: " + NeptuneCrypto.convertBytesToHex(dhSecret));
//                Log.d("Connection-Manager", "shared secret: " + NeptuneCrypto.convertBytesToHex(this.sharedSecret.getEncoded()));

                // hash
                MessageDigest digest = MessageDigest.getInstance("SHA-256");
                byte[] chkMsgEncodedHash = digest.digest(chkMsg.getBytes(StandardCharsets.UTF_8));
                String chkMsgHash = NeptuneCrypto.convertBytesToHex(chkMsgEncodedHash);

                // Encrypted
                String chkMsgEncrypted = NeptuneCrypto.encrypt(chkMsg, this.sharedSecret, null, this.cipherData);
                String chkMyself = NeptuneCrypto.decrypt(chkMsgEncrypted, this.sharedSecret);
                if (!chkMyself.equalsIgnoreCase(chkMsg))
                    throw new InvalidKeyException(); // Couldn't encrypt decrypt

                // the response.. needs b1, newPair, chkMsg, chkMsgHash, chkMsgHashFunction
                String publicKey = NeptuneCrypto.convertBytesToBase64(bobPublic.getY().toByteArray()); // this might be wrong

                String step2 = "{\"b1\": \"" + publicKey + "\",\"newPair\": true, \"chkMsg\": \"" + chkMsgEncrypted + "\", \"chkMsgHash\": \"" + chkMsgHash + "\", \"chkMsgHashFunction\": \"sha256\", \"clientId\": \"testClient\"}";
                Log.d("Connection-Manager", "Sending step2 data: " + step2);

                // Send step2
                URL url2 = new URL("http://" + this.IPAddress.toString() + "/api/v1/server/newSocketConnection/" + this.conInitUUID);
                Log.d("Connection-Manager", "Initiating connection: http://" + this.IPAddress.toString() + "/api/v1/server/newSocketConnection/" + this.conInitUUID);
                HttpURLConnection connection2 = (HttpURLConnection)url2.openConnection();
                connection2.setRequestMethod("POST");
                connection2.setRequestProperty("Content-Type", "application/json");
                connection2.setRequestProperty("Accept", "application/json");
                connection2.setDoOutput(true);

                try(OutputStream stream2 = connection2.getOutputStream()) { // dump the string into output
                    byte[] input = step2.getBytes(StandardCharsets.UTF_8);
                    stream2.write(input, 0, input.length);
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

                // we good
                return true;
            } catch (IOException e) {
                // damn
                e.printStackTrace();
            } catch (JSONException e) {
                // damn, shouldn't happen tho
                e.printStackTrace();
            } catch (NumberFormatException e) {
                // damn, shouldn't happen tho
                e.printStackTrace();
            } catch (NoSuchAlgorithmException e) {
                e.printStackTrace();
            } catch (InvalidAlgorithmParameterException e) {
                e.printStackTrace();
            } catch (InvalidKeyException e) {
                e.printStackTrace();
            } catch (NoSuchPaddingException e) {
                e.printStackTrace();
            } catch (InvalidKeySpecException e) {
                e.printStackTrace();
            }

        }
        return false;
    }

    public void initiateConnection() {
        Thread thread = new Thread(() -> initiateConnectionSync());
        thread.start();
        thread.setName(Server.serverId + " - Initiation runner");
    }

    public float ping() {
        throw new NotImplementedError();
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

    public void pair() {
        Log.i("ConnectionManager", "Pairing...");
    }
}
