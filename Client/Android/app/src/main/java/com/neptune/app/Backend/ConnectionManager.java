package com.neptune.app.Backend;

import android.annotation.SuppressLint;
import android.os.StrictMode;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParseException;
import com.google.gson.JsonParser;
import com.google.gson.JsonPrimitive;
import com.neptune.app.Backend.Exceptions.FailedToPair;
import com.neptune.app.Backend.Structs.APIDataPackage;
import com.neptune.app.MainActivity;

import java.io.IOException;
import java.math.BigInteger;
import java.net.InetAddress;
import java.net.MalformedURLException;
import java.net.URL;
import java.net.UnknownHostException;
import java.nio.charset.StandardCharsets;
import java.security.InvalidAlgorithmParameterException;
import java.security.InvalidKeyException;
import java.security.KeyFactory;
import java.security.KeyManagementException;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.security.spec.InvalidKeySpecException;
import java.text.DateFormat;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.ArrayDeque;
import java.util.Arrays;
import java.util.Date;
import java.util.Locale;
import java.util.Queue;
import java.util.UUID;

import java.util.concurrent.TimeUnit;

import javax.crypto.KeyAgreement;
import javax.crypto.NoSuchPaddingException;
import javax.crypto.SecretKey;
import javax.crypto.interfaces.DHPublicKey;
import javax.crypto.spec.DHParameterSpec;
import javax.crypto.spec.DHPublicKeySpec;
import javax.net.ssl.HostnameVerifier;
import javax.net.ssl.SSLContext;
import javax.net.ssl.SSLSession;
import javax.net.ssl.SSLSocketFactory;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509TrustManager;
import java.security.cert.X509Certificate;

import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
import okhttp3.ResponseBody;
import okhttp3.WebSocket;
import okhttp3.WebSocketListener;

public class ConnectionManager {
    // If true, we send the request queue as one request itself. Otherwise each request is sent individually (flooding the server!)
    private static final boolean SEND_QUEUE_AS_BATCH = true; // Do not change this!
    private final String TAG = "Connection-Manager";
    private static final String[] SUPPORTED_KEY_GROUPS = new String[]{"modp16", "modp17", "modp18"};
    private static final String[] SUPPORTED_CIPHERS = new String[]{"aes-128-gcm", "aes-256-gcm"};
    private static final String[] SUPPORTED_HASH_ALGORITHMS = new String[]{"sha256"};
    private static final boolean USE_DYNAMIC_SALT = false;
    private static final int HTTP_TIMEOUT_LENGTH = 30; // Set 15 second timeout for request/response
    private static final TimeUnit HTTP_TIMEOUT_TIMEUNIT = TimeUnit.SECONDS;

    public final EventEmitter EventEmitter = new EventEmitter();

    // Data transfer
    private OkHttpClient HTTPClient;
    private WebSocket webSocketClient;
    private final Queue<Request> RequestQueue = new ArrayDeque<>();
    private boolean pollServerForRequests = false; // If we should reach out and ping the server for requests
    private Date lastPollRequest; // Last time we polled the server. This forces compliance with ClientConfig.ConnectionManagerSettings.pollingInterval

    // Server properties
    // Server
    private final Server Server;
    // We've connected
    private boolean connected = false;
    private boolean hasNegotiated = false;
    private boolean connecting = false; // Process of connecting
    private boolean webSocketConnected = false;
    // Last time we've received a message
    private Date lastCommunicatedTime;
    // Server IP
    private IPAddress IPAddress;

    // Used to identify our connection
    private String conInitUUID;
    // Location of the web socket
    private String socketUUID; // socketId, used for POST requests and socket connection

    // Shared encryption key
    private SecretKey sharedSecret;
    // Encryption parameters
    private NeptuneCrypto.CipherData cipherData;

    public ConnectionManager(IPAddress ipAddress, Server parent) {
        this.IPAddress = ipAddress;
        this.Server = parent;

        // Build HTTP things
        // Create an SSL context with the trust manager
        try {
            // Trust manager (accept self-signed certificates
            // (yes, yes bad! Eventually we need to obtain the certificate from the server and accept that)
            @SuppressLint("CustomX509TrustManager")
            X509TrustManager trustManager = new X509TrustManager() {
                @SuppressLint("TrustAllX509TrustManager")
                @Override
                public void checkClientTrusted(X509Certificate[] chain, String authType) {
                }

                @SuppressLint("TrustAllX509TrustManager")
                @Override
                public void checkServerTrusted(X509Certificate[] chain, String authType) {
                }

                @Override
                public X509Certificate[] getAcceptedIssuers() {
                    return new X509Certificate[0];
                }
            };
            SSLContext sslContext = SSLContext.getInstance("TLS");
            sslContext.init(null, new TrustManager[]{trustManager}, new SecureRandom());
            // Create a socket factory with the SSL context
            SSLSocketFactory sslSocketFactory = sslContext.getSocketFactory();

            HTTPClient = new OkHttpClient.Builder()
                    .callTimeout(HTTP_TIMEOUT_LENGTH, HTTP_TIMEOUT_TIMEUNIT)
                    .pingInterval(MainActivity.ClientConfig.connectionManagerSettings.pingInterval, MainActivity.ClientConfig.connectionManagerSettings.pingIntervalTimeUnit)
                    .sslSocketFactory(sslSocketFactory, trustManager) // Accept select certificates
                    .hostnameVerifier(new ServerHostnameVerifier()) // Accept only server IP
                    .build();
        } catch (NoSuchAlgorithmException | KeyManagementException e) {
            e.printStackTrace();
        }

        if (HTTPClient == null) {
            HTTPClient = new OkHttpClient.Builder()
                    .callTimeout(HTTP_TIMEOUT_LENGTH, HTTP_TIMEOUT_TIMEUNIT)
                    .pingInterval(MainActivity.ClientConfig.connectionManagerSettings.pingInterval, MainActivity.ClientConfig.connectionManagerSettings.pingIntervalTimeUnit)
                    .hostnameVerifier(new ServerHostnameVerifier()) // Accept only server IP
                    .build();
        }

        Log.d("Connection-Manager", "Setup for " + ipAddress.toString());
    }

    // HTTP connection methods
    private class ServerHostnameVerifier implements HostnameVerifier { // Only allows connections from server IP

        public ServerHostnameVerifier() {
        }

        @Override
        public boolean verify(String hostname, SSLSession session) {
            InetAddress[] addresses;
            try {
                addresses = InetAddress.getAllByName(hostname);
                for (InetAddress address : addresses) {
                    String ip = address.getHostAddress();
                    if (ip != null && ip.equals(IPAddress.getIPAddress())) {
                        return true;
                    }
                }
            } catch (UnknownHostException e) {
                Log.e(TAG + "-HostnameVerifier", "Unable to resolve hostname! Unverified hostname: " + hostname);
                return false;
            }

            Log.e(TAG + "-HostnameVerifier", "Hostname does not match IP address registered for connection manager! Unverified hostname: " + hostname);
            return false;
        }
    }


    // HTTP methods

    /**
     * Fires off a prebuilt HTTP request. This should only be used by the parent sendHTTPPostRequest method and when processing the request queue.
     * If you're not one of those two, don't use this.
     *
     * @param postRequest     Prebuilt request
     * @param doNotAddToQueue Whether to add this request back to the queue if it fails.
     * @return Returns server response (or generic 408 if unavailable).
     */
    private Response fireOffHTTPRequest(Request postRequest, boolean doNotAddToQueue) {
        try {
            if ((!connected || !hasNegotiated) && !connecting) {
                this.initiateConnectionSync();
            }

            Response response = HTTPClient.newCall(postRequest).execute();
            Log.d(TAG, "Firing off HTTP request.");
            Log.i("Connection-Manager", "Got code: " + response.code());
            if (response.code() == 401) {
                connected = false;
                hasNegotiated = false;
                initiateConnection();

                response = HTTPClient.newCall(postRequest).execute();
            }

            lastCommunicatedTime = new Date();
            return response;
        } catch (FailedToPair | IOException e) {
            Log.i("Connection-Manager", "Server does not exist, or we cannot connect");
            e.printStackTrace();

            try {
                JsonObject jsonBody = JsonParser.parseString(postRequest.body().toString()).getAsJsonObject();
                if (jsonBody.has("command")) {
                    String command = jsonBody.get("command").getAsString();
                    String[] parts = command.split("/");
                    if (command.startsWith("/api/") && parts.length >= 6) {
                        String method = parts[5].toLowerCase();
                        if (parts[4].equalsIgnoreCase("request") && (method.equals("get") || method.equals("queue")))
                            Log.i(TAG, "Not adding request to queue as request is queue related itself. Command: " + command);
                        doNotAddToQueue = true; // Do not add queue commands (set/get/etc) to our queue!
                    }
                }
            } catch (Exception ignored) {
            } // generic catch, json parse probably
            if (!doNotAddToQueue) {
                Log.i(TAG, "Adding request to queue.");
                RequestQueue.add(postRequest);
            }

            return null;
        }
    }

    /**
     * Sends a synchronous HTTP Post request to a URL. This is NOT the same as the command/data request!
     * This is a post request text.
     *
     * @param url                      URL to send the POST request to
     * @param content                  Data to send
     * @param contentMimeType          Content-Type header. Data mime type you are sending (such as "application/json", the default value)
     * @param acceptedResponseMimeType Accept header value. What you want to get from the remote, such as "application/json" (default value).
     * @param doNotAddToQueue          Does not add this request to the queue if it fails to go through.
     * @return Response body. If error connection,
     */
    public Response sendHTTPPostRequest(@NonNull URL url, @NonNull String content, String contentMimeType, String acceptedResponseMimeType, boolean doNotAddToQueue) {
        Log.d("Connection-Manager", "Sending request to: " + url);
        Log.d("Connection-Manager", "Data to be sent: " + content);
        if (contentMimeType == null)
            contentMimeType = "application/json";
        if (acceptedResponseMimeType == null)
            acceptedResponseMimeType = "application/json";

        RequestBody postRequestBody = RequestBody.create(content, MediaType.parse(contentMimeType));
        Request postRequest = new Request.Builder()
                .url(url)
                .post(postRequestBody)
                .addHeader("conIntUUID", conInitUUID != null ? conInitUUID : "")
                .addHeader("Content-Type", contentMimeType)
                .addHeader("Accept", acceptedResponseMimeType)
                .build();

        Response response = fireOffHTTPRequest(postRequest, doNotAddToQueue);

        if (response != null && !RequestQueue.isEmpty()) { // If connect successful, and queued requests -> send them
            Thread pushRequestQueueThread = new Thread(() -> {
                sendQueuedRequestsToServer();
            });
            pushRequestQueueThread.setName(Server.serverId + "-pushRequestQueue");
            pushRequestQueueThread.run();
        }

        return response;
    }

    /**
     * Sends a synchronous HTTP Post request to a URL. This is NOT the same as the command/data request!
     * This is a post request text.
     * Adds request to queue if it fails to be delivered.
     *
     * @param url                      URL to send the POST request to
     * @param content                  Data to send
     * @param contentMimeType          Content-Type header. Data mime type you are sending (such as "application/json", the default value)
     * @param acceptedResponseMimeType Accept header value. What you want to get from the remote, such as "application/json" (default value).
     * @return Response body. If error connection,
     */
    public Response sendHTTPPostRequest(@NonNull URL url, @NonNull String content, String contentMimeType, String acceptedResponseMimeType) {
        return sendHTTPPostRequest(url, content, contentMimeType, acceptedResponseMimeType, false);
    }

    /**
     * Sends a asynchronous HTTP Post request to a URL. This is NOT the same as the command/data request!
     * This is a post request text.
     *
     * @param url                      URL to send the POST request to
     * @param content                  Data to send
     * @param contentMimeType          Content-Type header. Data mime type you are sending (such as "application/json")
     * @param doNotAddToQueue          Does not add this request to the queue if it fails to go through.
     * @param acceptedResponseMimeType Accept header value. What you want to get from the remote, such as "application/json".
     */
    public void sendHTTPPostRequestAsync(@NonNull URL url, String content, String contentMimeType, String acceptedResponseMimeType, boolean doNotAddToQueue) {
        Thread thread = new Thread(() -> {
            try {
                sendHTTPPostRequest(url, content, contentMimeType, acceptedResponseMimeType, doNotAddToQueue).close();
            } catch (Exception e) {
                Log.e(TAG, "Unknown error sending async HTTP post request: " + e.getMessage());
            }
        });
        thread.start();
        thread.setName(Server.serverId + " - HTTP POST request runner");
    }

    /**
     * Sends a asynchronous HTTP Post request to a URL. This is NOT the same as the command/data request!
     * This is a post request text.
     * Adds request to queue if it fails to be delivered.
     *
     * @param url                      URL to send the POST request to
     * @param content                  Data to send
     * @param contentMimeType          Content-Type header. Data mime type you are sending (such as "application/json")
     * @param acceptedResponseMimeType Accept header value. What you want to get from the remote, such as "application/json".
     */
    public void sendHTTPPostRequestAsync(@NonNull URL url, String content, String contentMimeType, String acceptedResponseMimeType) {
        sendHTTPPostRequestAsync(url, content, contentMimeType, acceptedResponseMimeType, false);
    }


    /**
     * Contains the Json response as well as the full HTTP response data.
     */
    private static class JsonResponse {
        public JsonObject Body = new JsonObject();
        public Response Response;

        JsonResponse() {
        }

        JsonResponse(JsonObject body, Response response) {
            Body = body;
            Response = response;
        }
    }

    /**
     * Sends a synchronous HTTP Post request (containing a Json body and expecting a Json response) to a URL.
     *
     * @param url             URL to send the POST request to
     * @param jsonData        Data to send
     * @param doNotAddToQueue Does not add this request to the queue if it fails to go through.
     * @return Response data
     */
    public JsonResponse sendHTTPPostRequest(@NonNull URL url, @NonNull JsonElement jsonData, boolean doNotAddToQueue) {
        Response response = null;
        String responseBody = "";
        try {
            response = sendHTTPPostRequest(url, jsonData.toString(), "application/json", "application/json", doNotAddToQueue);
            if (response != null) {
                ResponseBody responseResponseBody = response.body();
                if (responseResponseBody != null) {
                    responseBody = responseResponseBody.string();
                    if (responseBody.trim().isEmpty())
                        responseBody = "{}";
                }
                response.close();
            }

            JsonObject jsonBody = JsonParser.parseString(responseBody).getAsJsonObject();
            return new JsonResponse(jsonBody, response);

        } catch (Exception e) {
            Log.e(TAG, "Unable to parse Json response!");
            Log.d(TAG, "Post request response: " + responseBody);
            e.printStackTrace();
            if (response != null)
                return new JsonResponse(new JsonObject(), response);
            else
                return new JsonResponse();
        }
    }

    /**
     * Sends a synchronous HTTP Post request (containing a Json body and expecting a Json response) to a URL.
     * Adds request to queue if it fails to be delivered.
     *
     * @param url      URL to send the POST request to
     * @param jsonData Data to send
     * @return Response data
     */
    public JsonResponse sendHTTPPostRequest(@NonNull URL url, @NonNull JsonElement jsonData) {
        return sendHTTPPostRequest(url, jsonData, false);
    }

    /**
     * Sends a asynchronous HTTP Post request (containing a Json body and expecting a Json response) to a URL.
     *
     * @param url      URL to send the POST request to
     * @param jsonData Data to send
     */
    public void sendHTTPPostRequestAsync(@NonNull URL url, @NonNull JsonElement jsonData) {
        Thread thread = new Thread(() -> {
            try {
                sendHTTPPostRequest(url, jsonData);
            } catch (Exception e) {
                Log.e(TAG, "Unknown error sending async HTTP post request: " + e.getMessage());
            }
        });
        thread.start();
        thread.setName(Server.serverId + " - HTTP POST request runner");
    }

    // Convert data string to JsonElement
    private JsonObject decryptAndProcessPacket(JsonObject packet) {
        if (packet.has("data")) {
            String responseDataProperty = packet.get("data").getAsString();
            if (NeptuneCrypto.isEncrypted(responseDataProperty)) {
                try {
                    responseDataProperty = NeptuneCrypto.decrypt(responseDataProperty, this.sharedSecret);
                } catch (Exception e) {
                    Log.e(TAG, "Unable to decrypt response data.");
                    Log.e(TAG, e.getMessage());
                    e.printStackTrace();
                    responseDataProperty = "{}";
                }
            }

            packet.remove("data");
            JsonElement jsonBody = JsonParser.parseString(responseDataProperty);
            if (jsonBody.isJsonArray()) {
                packet.add("data", jsonBody.getAsJsonArray());
            } else if (jsonBody.isJsonObject()) {
                packet.add("data", jsonBody.getAsJsonObject());
            } else if (jsonBody.isJsonPrimitive()) {
                JsonPrimitive jsonPrimitive = jsonBody.getAsJsonPrimitive();
                if (jsonPrimitive.isString())
                    packet.addProperty("data", jsonPrimitive.getAsString());
                else if (jsonPrimitive.isNumber())
                    packet.addProperty("data", jsonPrimitive.getAsNumber());
                else if (jsonPrimitive.isBoolean())
                    packet.addProperty("data", jsonPrimitive.getAsBoolean());
                else
                    throw new JsonParseException("Data is unknown Json primitive.");
            } else {
                throw new JsonParseException("Data is not a Json array, object or primitive.");
            }
        }
        return packet;
    }

    /**
     * Sends a command packet to the server, as a POST request.
     *
     * @param apiURL            API endpoint (or command) you're calling.
     * @param requestData       POST data to be sent.
     * @param doNotQueueRequest Does not add this request to the queue if it fails to go through
     * @return Json response (empty if invalid response). Json response will contain "command" and a "data". Data can be an array, JsonObject or primitive. Command is the response endpoint
     */
    public JsonObject sendRequest(String apiURL, @NonNull JsonElement requestData, boolean doNotQueueRequest) {
        JsonObject obj = new JsonObject();
        obj.addProperty("conInitUUID", this.conInitUUID);
        obj.addProperty("command", apiURL);
        String data = requestData.toString();
        if (this.sharedSecret != null) {
            try {
                NeptuneCrypto.encrypt(data, this.sharedSecret, null, this.cipherData);
            } catch (InvalidKeyException | InvalidAlgorithmParameterException e) {
                Log.e(TAG, "Unable to encrypt request data.");
                Log.e(TAG, e.getMessage());
                e.printStackTrace();
            }
        }
        obj.addProperty("data", data);

        try {
            if (isWebSocketConnected()) {
                Log.d(TAG, "Sending data via WebSocket.");
                Log.d(TAG, "Data being sent: " + obj.toString());
                webSocketClient.send(obj.toString());

                return new JsonObject();
            } else {
                Log.d(TAG, "WebSocket unavailable, resorting to HTTP.");
                JsonResponse response = sendHTTPPostRequest(new URL("http://" + this.IPAddress.toString() + "/api/v1/server/socket/" + this.socketUUID + "/http"), obj, doNotQueueRequest);
                JsonObject responseBody = response.Body;

                return decryptAndProcessPacket(responseBody);
            }
        } catch (JsonParseException | MalformedURLException e) {
            Log.e(TAG, "Unable to parse JSON data.");
            Log.e(TAG, e.getMessage());
            e.printStackTrace();
            return new JsonObject();
        }
    }

    /**
     * Sends a command packet to the server, as a POST request.
     * Request is added to a queue if it fails.
     *
     * @param apiURL      API endpoint (or command) you're calling.
     * @param requestData POST data to be sent.
     * @return Json response (empty if invalid response). Json response will contain "command" and a "data". Data can be an array, JsonObject or primitive. Command is the response endpoint
     */
    public JsonObject sendRequest(String apiURL, @NonNull JsonElement requestData) {
        return sendRequest(apiURL, requestData, false);
    }

    /**
     * Creates a new thread that sends a command packet to the server, as a POST request.
     *
     * @param apiURL            API endpoint (or command) you're calling.
     * @param requestData       POST data to be sent.
     * @param doNotQueueRequest Does not add this request to the queue if it fails to go through
     */
    public void sendRequestAsync(String apiURL, @NonNull JsonElement requestData, boolean doNotQueueRequest) {
        Thread thread = new Thread(() -> sendRequest(apiURL, requestData, doNotQueueRequest));
        thread.start();
        thread.setName(Server.serverId + " - HTTP POST request runner");
    }

    /**
     * Creates a new thread that sends a command packet to the server, as a POST request.
     * Request is added to a queue if it fails.
     *
     * @param apiURL      API endpoint (or command) you're calling.
     * @param requestData POST data to be sent.
     */
    public void sendRequestAsync(String apiURL, @NonNull JsonElement requestData) {
        sendRequestAsync(apiURL, requestData, false);
    }


    // Polling

    /**
     * Enable or disable connection manager polling method {@code pollServerForRequests()}.
     *
     * @param pollServerForRequests If true, {@code pollServerForRequests()} is usable, if false the method turns off (does nothing).
     */
    public void setPollServerForRequests(boolean pollServerForRequests) {
        this.pollServerForRequests = pollServerForRequests;
    }

    /**
     * Used to process a command that either in a batch or alone when we polled the server for requests.
     * Each packet is encrypted it self, so decrypt the data!
     *
     * @param requestPacket Command + data json packet. Normal request.
     */
    private void processServerPollRequestPacket(JsonObject requestPacket) {
        JsonObject packet = decryptAndProcessPacket(requestPacket);
        if (!packet.has("command") || !packet.has("data")) {
            Log.e(TAG, "ProcessServerPollRequest: invalid packet");
            return;
        }

        this.EventEmitter.emit("command", packet); // Let the listeners handle it!
    }

    /**
     * Polls the server, grabbing any queued requests they're storing.
     *
     * @param force Ignore client's polling interval setting and poll regardless of the time elapsed since last poll.
     */
    public void pollServerForRequests(boolean force) {
        if (!pollServerForRequests)
            return; // Polling disabled

        if (lastPollRequest != null && !force) {
            long currentTime = System.currentTimeMillis();
            int pollingInterval = MainActivity.ClientConfig.connectionManagerSettings.pollingInterval;
            TimeUnit pollingTimeUnit = MainActivity.ClientConfig.connectionManagerSettings.pollingIntervalTimeUnit;
            long pollingIntervalInMilliseconds = pollingTimeUnit.toMillis(pollingInterval);
            long elapsedTimeInMilliseconds = currentTime - lastPollRequest.getTime();

            if (elapsedTimeInMilliseconds < pollingIntervalInMilliseconds) {
                // Not enough time has elapsed, wait until next time
                return;
            }
        }
        lastPollRequest = new Date();

        JsonObject queueResponse = sendRequest("/api/v1/server/requestQueue/get", new JsonObject());
        if (!queueResponse.has("data") || !queueResponse.has("command")) {
            return; // No data ..
        }

        if (queueResponse.get("data").isJsonObject()) {
            // Just one request?
            processServerPollRequestPacket(queueResponse.get("data").getAsJsonObject());
        } else if (queueResponse.get("data").isJsonArray()) {
            JsonArray requests = queueResponse.get("data").getAsJsonArray();
            for (JsonElement requestElement : requests) {
                if (requestElement.isJsonObject()) { // Should be..!
                    processServerPollRequestPacket(requestElement.getAsJsonObject());
                }
            }
        }
    }

    /**
     * Sends any failed requests that have been queued up to the server.
     */
    public synchronized void sendQueuedRequestsToServer() {
        if (RequestQueue.isEmpty())
            return;

        if (!SEND_QUEUE_AS_BATCH) { // Send each request individually, floods the server! Do not do! Not default!
            ArrayDeque<Request> copiedQueue = new ArrayDeque<>(RequestQueue);
            RequestQueue.clear(); // Empty the queue (we have it)
            while (!copiedQueue.isEmpty()) {
                Request queuedRequest = copiedQueue.poll();
                if (queuedRequest != null) {
                    fireOffHTTPRequest(queuedRequest, false).close(); // Add back to queue if it fails.
                }
            }
        } else { // This is the default! Build a queue request to send all queued requests to the server in a batch style.
            ArrayDeque<Request> copiedQueue = new ArrayDeque<>(RequestQueue);
            RequestQueue.clear(); // Empty the queue (we have it)

            JsonArray queueRequestData = new JsonArray();

            while (!copiedQueue.isEmpty()) {
                Request queuedRequest = copiedQueue.poll();
                if (queuedRequest != null) {
                    // Pull request body, add
                    try {
                        JsonObject queuedRequestPacket = JsonParser.parseString(queuedRequest.body().toString()).getAsJsonObject();
                        queueRequestData.add(queuedRequestPacket); // Adds the Json data to the queue array
                    } catch (Exception ignored) {
                        // Not Json data! Send the request by itself.
                        Log.d(TAG, "Send queue: unable to add request to queue request packet. Request content-type: " + queuedRequest.header("Content-Type"));
                        fireOffHTTPRequest(queuedRequest, false).close(); // Add to queue if that also fails.
                    }
                }
            }

            sendRequest("/api/v1/client/requestqueue/queue", queueRequestData, true); // Don't queue this!
        }
    }

    // WebSocket

    /**
     * Creates a WebSocket connection to the server
     */
    public void createWebSocketClient(boolean force) {
        Request webSocketRequest = new Request.Builder()
                .url("http://" + this.IPAddress + "/api/v1/server/socket/" + this.socketUUID)
                .build();

        if (webSocketClient != null) {
            if (webSocketConnected && !force) {
                return; // Do not recreate if already connected ..?
            }
            webSocketClient.close(1000, "reconnecting");
        }
        webSocketClient = HTTPClient.newWebSocket(webSocketRequest, new WebSocketListener() {
            @Override
            public void onClosed(@NonNull WebSocket webSocket, int code, @NonNull String reason) {
                super.onClosed(webSocket, code, reason);
                Log.e(TAG, "WebSocket disconnected, code:>reason: " + code + reason);

                // Start polling thread/service ?
                setPollServerForRequests(true);
                webSocketConnected = false;

                if (reason.equalsIgnoreCase("invalidsocketuuid") || reason.equalsIgnoreCase("invalidclient")) {
                    hasNegotiated = false;
                    connected = false;
                    initiateConnection();
                }
                if (reason.equalsIgnoreCase("reconnecting")) {
                    // reconnect???
                    createWebSocketClient(false);
                }
            }

            @Override
            public void onFailure(@NonNull WebSocket webSocket, @NonNull Throwable t, @Nullable Response response) {
                super.onFailure(webSocket, t, response);
                String body = "EMPTY_BODY";
                try {
                    if (response.body() != null) {
                        try {
                            body = response.body().string();
                        } catch (Exception ignored) {
                        }
                    }
                } catch (Exception ignored) {
                }

                if (response != null) {
                    Log.e(TAG, "WebSocket failed, status code:>message: "
                            + response.code() + ":>"
                            + body);
                } else {
                    Log.e(TAG, "WebSocket failed, no response data. Terminated?");
                }
                // Start polling thread/service
                setPollServerForRequests(true);
                webSocketConnected = false;
                if (response != null)
                    response.close();
            }

            @Override
            public void onMessage(@NonNull WebSocket webSocket, @NonNull String message) {
                try {
                    super.onMessage(webSocket, message);
                    Log.d(TAG, "WebSocket message: " + message);
                    handleWebsocketMessage(message);
                    setPollServerForRequests(true);
                } catch (Exception e) {
                    Log.e(TAG, "Error handling websocket message!");
                    Log.e(TAG, e.getMessage());
                }
            }

            @Override
            public void onOpen(@NonNull WebSocket webSocket, @NonNull Response response) {
                super.onOpen(webSocket, response);

                String body = "EMPTY_BODY";
                try {
                    if (response.body() != null) {
                        try {
                            body = response.body().string();
                        } catch (Exception ignored) {
                        }
                    }
                } catch (Exception ignored) {
                }

                if (response != null) {
                    Log.i(TAG, "WebSocket connected! ServerHandshake status code:>message: "
                            + response.code() + ":>"
                            + body);
                } else {
                    Log.i(TAG, "WebSocket connection, but without any response data?");
                }

                webSocketConnected = true;
                if (response != null)
                    response.close();
            }
        });
    }

    public boolean isWebSocketConnected() {
        return webSocketConnected;
    }

    /**
     * Helper function to handle incoming commands over the websocket.
     *
     * @param message Message that was received from the server. Will be process as Json data.
     */
    private void handleWebsocketMessage(String message) {
        try {
            JsonObject jsonResponse = decryptAndProcessPacket(JsonParser.parseString(message).getAsJsonObject());
            APIDataPackage apiData = new APIDataPackage(jsonResponse);
            this.EventEmitter.emit("command", apiData);
        } catch (JsonParseException e) {
            Log.e(TAG, "WebSocket unable to parse api message!");
            e.printStackTrace();
        }
    }


    // Initiating connections

    /**
     * Creates the initial Json data for initialing a server connection.
     *
     * @return Json body
     */
    private JsonObject getConnectionInitiationInitiatingBody() {
        JsonObject jsonBody = new JsonObject();

        // Key groups
        JsonArray supportedKeyGroups = new JsonArray();
        for (String keyGroup : SUPPORTED_KEY_GROUPS) {
            supportedKeyGroups.add(keyGroup);
        }
        jsonBody.add("supportedKeyGroups", supportedKeyGroups);

        // Ciphers
        JsonArray supportedCiphers = new JsonArray();
        for (String cipher : SUPPORTED_CIPHERS) {
            supportedCiphers.add(cipher);
        }
        jsonBody.add("supportedCiphers", supportedCiphers);

        // Hash algorithms
        JsonArray supportedHashAlgorithms = new JsonArray();
        for (String hashAlgorithm : SUPPORTED_HASH_ALGORITHMS) {
            supportedHashAlgorithms.add(hashAlgorithm);
        }
        jsonBody.add("supportedHashAlgorithms", supportedHashAlgorithms);

        // Use dynamic salt?
        jsonBody.addProperty("useDynamicSalt", USE_DYNAMIC_SALT);

        return jsonBody;
    }

    /**
     * Cancels an initiation request. Scrap URL (/api/v1/server/initiateConnection/{conInitId}/scrap).
     *
     * @param reason Error to provide to the server.
     */
    private void scrapInitiationRequest(String reason) {
        try {
            URL scrapURL;
            if (this.IPAddress != null && conInitUUID != null) {
                scrapURL = new URL("http://" + this.IPAddress + "/api/v1/server/initiateConnection" + conInitUUID + "/scrap");
                sendHTTPPostRequest(scrapURL, "{ \"error\": \"" + reason + "\" }", "application/json", "*");
            }
        } catch (Exception ignored) {
        }
    }

    /**
     * Initiate a connection to the server, completing the handshake, and pairing if need be.
     *
     * @throws FailedToPair Unable to connect, message includes readable reason as to why.
     */
    public void initiateConnectionSync() throws FailedToPair {
        if (connecting)
            return;
        try {
            StrictMode.ThreadPolicy policy = new StrictMode.ThreadPolicy.Builder().permitAll().build(); // ?
            StrictMode.setThreadPolicy(policy);
            connecting = true;

            URL initiateConnectionURL = new URL("http://" + this.IPAddress + "/api/v1/server/initiateConnection");
            Log.d(TAG, "Initiating connection: " + initiateConnectionURL);

            JsonObject initiatingBody = getConnectionInitiationInitiatingBody();
            JsonResponse initiatingResponse = sendHTTPPostRequest(initiateConnectionURL, initiatingBody, true);
            JsonObject initiatingResponseBody = initiatingResponse.Body;
            Log.d(TAG, "Received response: " + initiatingResponseBody.toString());

            if (initiatingResponseBody.has("error"))
                throw new FailedToPair(initiatingResponseBody.get("error").getAsString());

            if (initiatingResponse.Response == null)
                throw new FailedToPair("Server unreachable.");
            initiatingResponse.Response.close();
            if (!initiatingResponseBody.has("conInitUUID")
                    || !initiatingResponseBody.has("g1")
                    || !initiatingResponseBody.has("p1")
                    || !initiatingResponseBody.has("a1")
                    || !initiatingResponseBody.has("selectedCipher")
                    || !initiatingResponseBody.has("selectedKeyGroup")
                    || !initiatingResponseBody.has("selectedHashAlgorithm")) {
                // Not all properties are there! Invalid response!
                Log.e(TAG, "Invalid response (step 2).");
                StringBuilder properties = new StringBuilder();
                boolean addedOne = false;
                for (String property : initiatingResponseBody.keySet()) {
                    if (addedOne)
                        properties.append(",");
                    else
                        addedOne = true;
                    properties.append(property);
                }
                Log.d(TAG, "Found properties: " + properties);
                throw new FailedToPair("Invalid phase one handshake data.");
            }
            this.conInitUUID = initiatingResponseBody.get("conInitUUID").getAsString();

            // We need g1, p1, a1, and conInitUUID (all in b64, except uuid)
            byte[] g1Bytes = NeptuneCrypto.convertBase64ToBytes(initiatingResponseBody.get("g1").getAsString());
            BigInteger g1 = new BigInteger(1, g1Bytes);

            byte[] p1Bytes = NeptuneCrypto.convertBase64ToBytes(initiatingResponseBody.get("p1").getAsString());
            BigInteger p1 = new BigInteger(1, p1Bytes);

            byte[] a1Bytes = NeptuneCrypto.convertBase64ToBytes(initiatingResponseBody.get("a1").getAsString());
            BigInteger a1 = new BigInteger(1, a1Bytes);

            // Select cipher
            String selectedCipher = SUPPORTED_CIPHERS[0];
            if (initiatingResponseBody.has("selectedCipher"))
                selectedCipher = initiatingResponseBody.get("selectedCipher").getAsString();
            if (!Arrays.asList(SUPPORTED_CIPHERS).contains(selectedCipher)) { // Validate supported cipher
                scrapInitiationRequest("InvalidCipher");
                throw new FailedToPair("Unsupported cipher selected: " + selectedCipher);
            }

            String selectedHashAlgorithm = SUPPORTED_HASH_ALGORITHMS[0];
            if (initiatingResponseBody.has("selectedHashAlgorithm"))
                selectedHashAlgorithm = initiatingResponseBody.get("selectedHashAlgorithm").getAsString();
            if (!Arrays.asList(SUPPORTED_HASH_ALGORITHMS).contains(selectedHashAlgorithm)) { // Validate supported hash
                scrapInitiationRequest("InvalidHashAlgorithm");
                throw new FailedToPair("Unsupported hash algorithm selected: " + selectedHashAlgorithm);
            }

            // Generate DH key
            DHParameterSpec sharedDHParameterSpec = new DHParameterSpec(p1, g1);
            KeyAgreement ourDHKeyAgreementInstance = KeyAgreement.getInstance("DH");
            KeyPairGenerator ourDHKeyPairGeneratorInstance = KeyPairGenerator.getInstance("DH");
            ourDHKeyPairGeneratorInstance.initialize(sharedDHParameterSpec);
            // Generate our key pair
            KeyPair ourDHKeyPair = ourDHKeyPairGeneratorInstance.generateKeyPair();
            DHPublicKey ourDHPublicKey = (DHPublicKey) ourDHKeyPair.getPublic();
            //Log.d(TAG, "bob public: " + NeptuneCrypto.convertBytesToHex(ourDHPublicKey.getY().toByteArray()));
            // Generate shared secret
            ourDHKeyAgreementInstance.init(ourDHKeyPair.getPrivate());
            DHPublicKey serverDHPublicKey = (DHPublicKey) KeyFactory.getInstance("DH").generatePublic(new DHPublicKeySpec(a1, p1, g1));
            ourDHKeyAgreementInstance.doPhase(serverDHPublicKey, true);

            byte[] sharedDHSecretKey = ourDHKeyAgreementInstance.generateSecret();
            this.cipherData = new NeptuneCrypto.CipherData(selectedCipher, selectedHashAlgorithm);
            NeptuneCrypto.HKDFOptions options = new NeptuneCrypto.HKDFOptions(this.cipherData);
            options.keyLength = 32; // We want the shared key to be 32byte
            AESKey sharedAESKey = NeptuneCrypto.HKDF(sharedDHSecretKey, "mySalt1234", options);
            // We do this first! After we encrypt the client id, then we use the pairKey!
            this.sharedSecret = sharedAESKey.getKey();
            //Log.d(TAG, "bob secret: " + NeptuneCrypto.convertBytesToHex(((DHPrivateKey)ourDHKeyPair.getPrivate()).getX().toByteArray()));
            //Log.d(TAG, "DH secret: " + NeptuneCrypto.convertBytesToHex(sharedDHSecretKey));
            //Log.d(TAG, "shared secret: " + NeptuneCrypto.convertBytesToHex(this.sharedSecret.getEncoded()));


            // Create responses
            String chkMsg = NeptuneCrypto.convertStringToBase64(NeptuneCrypto.randomString(64)); // idk why b64
            // hash
            MessageDigest chkMsgDigest = MessageDigest.getInstance((selectedHashAlgorithm.equalsIgnoreCase("sha512")) ? "SHA-512" : "SHA-256");
            byte[] chkMsgEncodedHash = chkMsgDigest.digest(chkMsg.getBytes(StandardCharsets.UTF_8));
            String chkMsgHash = NeptuneCrypto.convertBytesToHex(chkMsgEncodedHash);
            // ConfMsg
            MessageDigest confMsgDigest = MessageDigest.getInstance((selectedHashAlgorithm.equalsIgnoreCase("sha512")) ? "SHA-512" : "SHA-256");
            String chkMsgCombinedWithChkMsgHash = chkMsg + chkMsgHash;
            byte[] expectedConfMsgBytes = confMsgDigest.digest(chkMsgCombinedWithChkMsgHash.getBytes(StandardCharsets.UTF_8));
            String expectedConfMsg = NeptuneCrypto.convertBytesToHex(expectedConfMsgBytes);

            // Encrypted
            String clientIdString = NeptuneCrypto.encrypt(MainActivity.ClientConfig.clientId.toString(), this.sharedSecret, null, this.cipherData);
            // clientIdString must be encrypted using a shared key that was derived using a shared static salt.
            // Server needs to be able to decrypt the client id before using the correct shared key which is derived using the pairKey.
            boolean newPair = true;
            if (this.Server.pairKey != null) {
                if (!this.Server.pairKey.isEmpty()) {
                    newPair = false;
                    AESKey sharedAESKeyWithPairKey = NeptuneCrypto.HKDF(sharedDHSecretKey, this.Server.pairKey, options);
                    this.sharedSecret = sharedAESKeyWithPairKey.getKey();
                }
            }
            String chkMsgEncrypted = NeptuneCrypto.encrypt(chkMsg, this.sharedSecret, null, this.cipherData);
            String chkMyself = NeptuneCrypto.decrypt(chkMsgEncrypted, this.sharedSecret);
            if (!chkMyself.equalsIgnoreCase(chkMsg)) {
                scrapInitiationRequest("InvalidSharedKey");
                throw new InvalidKeyException(); // Couldn't encrypt decrypt
            }

            // the response.. needs b1, newPair, chkMsg, chkMsgHash, chkMsgHashFunction
            String b1 = NeptuneCrypto.convertBytesToBase64(ourDHPublicKey.getY().toByteArray());
            JsonObject initiationFinalRequestBody = new JsonObject();
            initiationFinalRequestBody.addProperty("b1", b1);
            initiationFinalRequestBody.addProperty("newPair", newPair);
            initiationFinalRequestBody.addProperty("chkMsg", chkMsgEncrypted);
            initiationFinalRequestBody.addProperty("chkMsgHash", chkMsgHash);
            initiationFinalRequestBody.addProperty("chkMsgHashFunction", selectedHashAlgorithm);
            initiationFinalRequestBody.addProperty("clientId", clientIdString);
            Log.d(TAG, "Sending step2 data: " + initiationFinalRequestBody);

            // Send step2
            URL initiationFinalRequestURL = new URL("http://" + this.IPAddress + "/api/v1/server/initiateConnection/" + this.conInitUUID);
            Log.d(TAG, "Initiating connection: " + initiationFinalRequestURL);
            Response initiationFinalResponse = sendHTTPPostRequest(initiationFinalRequestURL, initiationFinalRequestBody.toString(), "application/json", "application/json", true);
            if (initiatingResponse == null)
                throw new FailedToPair("Server unreachable.");

            String initiationFinalResponseBodyString = initiationFinalResponse.body().string();
            Log.d(TAG, "Received response: " + initiationFinalResponseBodyString);
            JsonObject initiationFinalResponseBody = new JsonObject();

            // Successful?
            if (!initiationFinalResponse.isSuccessful()) {
                try {
                    initiationFinalResponseBody = JsonParser.parseString(initiationFinalResponseBodyString).getAsJsonObject();
                } catch (Exception ignored) {
                }

                if (initiationFinalResponseBody.has("error"))
                    throw new FailedToPair(initiationFinalResponseBody.get("error").getAsString());
                else
                    throw new FailedToPair("Server returned code " + initiationFinalResponse.code());
            }
            initiationFinalResponse.close();

            if (NeptuneCrypto.isEncrypted(initiationFinalResponseBodyString)) {
                String decryptedResponseBody = NeptuneCrypto.decrypt(initiationFinalResponseBodyString, this.sharedSecret);
                initiationFinalResponseBody = JsonParser.parseString(decryptedResponseBody).getAsJsonObject();
            } else {
                initiationFinalResponseBody = JsonParser.parseString(initiationFinalResponseBodyString).getAsJsonObject();
            }

            Log.d(TAG, "Received response: " + initiationFinalResponseBody.toString());

            if (!initiationFinalResponseBody.has("socketUUID")
                    || !initiationFinalResponseBody.has("confMsg")) {
                Log.e(TAG, "Invalid response (step 2).");
                StringBuilder properties = new StringBuilder();
                boolean addedOne = false;
                for (String property : initiationFinalResponseBody.keySet()) {
                    if (addedOne)
                        properties.append(",");
                    else
                        addedOne = true;
                    properties.append(property);
                }
                Log.d(TAG, "Found properties: " + properties);
                throw new FailedToPair("Invalid phase two handshake data.");
            }


            // validate confMsg
            String confMsg = initiationFinalResponseBody.get("confMsg").getAsString();
            if (!confMsg.equalsIgnoreCase(expectedConfMsg)) {
                Log.e(TAG, "confMsg is invalid!");
                Log.d(TAG, "Got confMsg: " + confMsg + ", expected: " + expectedConfMsg);
                throw new FailedToPair("Failed to validate key in handshake.");
            }

            this.socketUUID = initiationFinalResponseBody.get("socketUUID").getAsString();
            this.connected = true;
            this.hasNegotiated = true;
            Log.i(TAG, "Connection complete! SocketUUID: " + this.socketUUID);

            if (this.Server.pairId == null) {
                Log.d(TAG, "New server, beginning pair.");
                this.pair(); // Pair now
            }

            // we good
            connecting = false;
            createWebSocketClient(false);
        } catch (IOException e) { // Unable to connect
            connecting = false;
            Log.e(TAG, "No server response (initiating connection). Is it running?");
            e.printStackTrace();
            throw new FailedToPair("Unable to connect to server application.");

        } catch (JsonParseException e) {
            connecting = false;
            Log.e(TAG, "Json parse exception on server response (initiating connection).");
            e.printStackTrace();
            throw new FailedToPair("Invalid server response.");

        } catch (NumberFormatException e) {
            connecting = false;
            e.printStackTrace();
            throw new FailedToPair("Number format exception?"); // ? because what?

        } catch (InvalidKeyException e) {
            connecting = false;
            e.printStackTrace();
            throw new FailedToPair("Client-server handshake failure, unable to generate a shared key.");

        } catch (NoSuchPaddingException | InvalidKeySpecException | InvalidAlgorithmParameterException | NoSuchAlgorithmException e) {
            connecting = false;
            Log.e(TAG, "Someone used the wrong padding, key spec, or algorithm (initiating connection).");
            e.printStackTrace();
            throw new FailedToPair("Client-server handshake failure, unable to select supported handshake parameters.");
        } finally {
            connecting = false;
        }
        connecting = false;
    }

    /**
     * Connect to the server (pair if required), create+connect websocket
     */
    public void initiateConnection() {
        Thread thread = new Thread(() -> {
            try {
                initiateConnectionSync();

                // Creates WebSocket and connects to the server
                if (!isWebSocketConnected() && !connecting && connected)
                    createWebSocketClient(false);
            } catch (FailedToPair e) {
                e.printStackTrace();
            }
        });
        thread.start();
        thread.setName(Server.serverId + " - Initiation runner");
    }

    /**
     * Pings the server, returns the RTT. -1 if failed/not connected.
     *
     * @return Round trip ping time, or -1 if failure.
     */
    public double ping() {
        try {
            if (!this.connected)
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
                    @SuppressLint("SimpleDateFormat")
                    DateFormat df1 = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");
                    Date serverTimestamp = df1.parse(timeStamp);
                    long diffInMilliseconds = Math.abs(serverTimestamp.getTime() - new Date().getTime());
                    //long diff = TimeUnit.DAYS.convert(diffInMilliseconds, TimeUnit.MILLISECONDS);
                    Log.d("ConnectionManager-" + this.Server.serverId, "Server " + this.Server.friendlyName + " ping: " + diffInMilliseconds + "ms");
                    this.Server.sendBatteryInfo();
                    return diffInMilliseconds;
                }
            }
        } catch (ParseException e) {
            e.printStackTrace();
            return -1;
        }

        return -1;
    }

    public String getSocketUUID() {
        return this.socketUUID;
    }

    public void disconnect() {
        Log.i(TAG, "Disconnecting");
        webSocketClient.close(1001, "disconnect");
    }

    public void destroy(boolean force) {
        Log.i(TAG, "Destroying..");
        webSocketClient.close(1001, "conManagerDestroyed");
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

        } catch (Exception e) {
            e.printStackTrace();
            throw new FailedToPair(e.getMessage());
        }
    }
}
