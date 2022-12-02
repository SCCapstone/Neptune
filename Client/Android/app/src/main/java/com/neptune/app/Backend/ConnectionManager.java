package com.neptune.app.Backend;

import android.os.StrictMode;
import android.util.Base64;
import android.util.Log;

import androidx.annotation.NonNull;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.math.BigInteger;
import java.net.HttpURLConnection;
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
import javax.crypto.interfaces.DHPublicKey;
import javax.crypto.spec.DHParameterSpec;
import javax.crypto.spec.DHPublicKeySpec;
import javax.crypto.spec.SecretKeySpec;

import at.favre.lib.crypto.HKDF;
import kotlin.NotImplementedError;

public class ConnectionManager {
    protected boolean hasNegotiated;
    protected Date lastCommunicatedTime;
    protected java.net.Socket Socket;
    // protected AsyncHttpClient AsyncHttpClient; // Eh maybe not

    private IPAddress IPAddress;
    private ConfigItem Configuration;

    /**
     * This is the connection initiation Id, used to identify the connection
     */
    private String conInitUUID;
    private String socketUUID; // socketId, used for POST requests and socket connection

    private SecretKey sharedSecret;
    private NeptuneCrypto.CipherData cipherData;

    public ConnectionManager(IPAddress ipAddress, ConfigItem configItem) {
        this.IPAddress = ipAddress;
        this.Configuration = configItem;
        Log.d("Connection-Manager", "Setup for " + ipAddress.toString());
    }

    // This sends a request ... somehow ... probably over socket do not use
    public void sendRequest(JSONObject requestData) {
        throw new NotImplementedError();
    }

    // This sends a POST request
    // apiURL is the 'api' or command you're calling, request data the ... data, and callback ... nothing for now
    public JSONObject sendRequest(String apiURL, JSONObject requestData) throws JSONException { //, Callable<Void> callback) {


        return new JSONObject("{}");
    }

    public boolean initiateConnection() {
        // Step 1: send
        /*
        {
            "acceptedKeyGroups": [
                14,
                16,
                17
            ],
            "acceptedHashTypes": [
                "chacha20",
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
            StrictMode.ThreadPolicy policy = new StrictMode.ThreadPolicy.Builder()
                    .permitAll().build();
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

                String connectionParameters = "{\"acceptedKeyGroups\": [14,16,17],\"acceptedHashTypes\": [\"aes-256-cbc\"],\"acceptedCrypto\": [\"sha256\"], \"useDynamicSalt\": false }";

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
                BigInteger g1 = new BigInteger(1, Base64.decode(serverResponse.getString("g1"),2)); //new BigInteger("2"); // I don't make the rules
                BigInteger p1 = new BigInteger(1, Base64.decode(serverResponse.getString("p1"),2)); //new BigInteger(NeptuneCrypto.convertBase64ToString(serverResponse.getString("p1")));
                BigInteger a1 = new BigInteger(1, Base64.decode(serverResponse.getString("a1"),2)); //new BigInteger(NeptuneCrypto.convertBase64ToString(serverResponse.getString("a1")));
                this.conInitUUID = serverResponse.getString("conInitUUID");

                // generate response (input for step2)
                DHParameterSpec dhParams = new DHParameterSpec(p1, g1);
                KeyAgreement keyAgreement = KeyAgreement.getInstance("DH");

                KeyPairGenerator keyGen = KeyPairGenerator.getInstance("DH");
                keyGen.initialize(dhParams, new SecureRandom());
                KeyPair keyPair = keyGen.generateKeyPair();
                keyAgreement.init(keyPair.getPrivate());
                PublicKey alicePublic = KeyFactory.getInstance("DiffieHellman").generatePublic(new DHPublicKeySpec(a1, p1, g1));
                keyAgreement.doPhase(alicePublic, true);
                this.cipherData = new NeptuneCrypto.CipherData("aes-256-cbc", "sha256");
                AESKey sharedAESKey = NeptuneCrypto.HKDF(keyAgreement.generateSecret(), this.cipherData);
                this.sharedSecret = sharedAESKey.getKey();

                String chkMsg = NeptuneCrypto.convertStringToBase64(NeptuneCrypto.randomString(64)); // idk why b64

                // hash
                MessageDigest digest = MessageDigest.getInstance("SHA-256");
                byte[] chkMsgEncodedHash = digest.digest(chkMsg.getBytes(StandardCharsets.UTF_8));
                String chkMsgHash = NeptuneCrypto.convertBytesToHex(chkMsgEncodedHash);

                // Encrypted
                String chkMsgEncyrpted = NeptuneCrypto.encrypt(chkMsg, this.sharedSecret, null, this.cipherData);

                // the response.. needs b1, newPair, chkMsg, chkMsgHash, chkMsgHashFunction
                DHPublicKey bobPublic = (DHPublicKey)keyPair.getPublic();
                String publicKey = NeptuneCrypto.convertStringToBase64(String.valueOf(bobPublic.getY().toByteArray())); // this might be wrong

                String step2 = "{\"b1\": \"" + publicKey + "\",\"newPair\": true, \"chkMsg\": \"" + chkMsgEncyrpted + "\", \"chkMsgHash\": \"" + chkMsgHash + "\", \"chkMsgHashFunction\": \"sha256\", \"clientId\": \"testClient\"}";
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

                Log.d("Connection-Manager", "Received response: " + response2.toString());

                JSONObject serverResponse2 = new JSONObject(response2.toString());


                // validate confMsg
                this.socketUUID = serverResponse2.getString("socketUUID");

                Log.d("Connection-Manager", "SocketUUID: " + this.socketUUID);

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

    public Socket getSocket() {
        return Socket;
    }

    public Date getLastCommunicatedTime() {
        return lastCommunicatedTime;
    }

}
