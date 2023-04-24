package com.neptune.app;

import static org.junit.Assert.assertEquals;

import android.app.Application;
import android.content.Context;
import android.content.pm.ApplicationInfo;

import androidx.test.core.app.ApplicationProvider;
import androidx.test.ext.junit.rules.ActivityScenarioRule;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.neptune.app.Backend.ConfigurationManager;
import com.neptune.app.Backend.EventEmitter;
import com.neptune.app.Backend.Exceptions.FailedToPair;
import com.neptune.app.Backend.Exceptions.TooManyEventListenersException;
import com.neptune.app.Backend.Exceptions.TooManyEventsException;
import com.neptune.app.Backend.IPAddress;
import com.neptune.app.Backend.Interfaces.ICallback;
import com.neptune.app.Backend.Server;

import junit.framework.Assert;

import org.junit.After;
import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;
import org.junit.runner.RunWith;

import java.io.IOException;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;

import okhttp3.HttpUrl;
import okhttp3.OkHttpClient;
import okhttp3.Response;
import okhttp3.WebSocket;
import okhttp3.WebSocketListener;
import okhttp3.mockwebserver.MockResponse;
import okhttp3.mockwebserver.MockWebServer;


public class ServerIncoming {
    private MockWebServer mockWebServer;

    private ConfigurationManager configurationManager;

    private Server testServer;
    private WebSocket webSocket;

    private EventEmitter WebsocketListenerMessageEvents = new EventEmitter();

    @Rule
    public ActivityScenarioRule<MainActivity> mainRule = new ActivityScenarioRule<>(MainActivity.class);

    @Before
    public void setUp() throws IOException, FailedToPair {
        configurationManager = new ConfigurationManager(ApplicationProvider.getApplicationContext());

        UUID serverId = UUID.randomUUID();
        UUID socketUUID = UUID.randomUUID();
        MockWebServer mockWebServer = new MockWebServer();
        mockWebServer.start();

        testServer = new Server(serverId, configurationManager);
        testServer.friendlyName = "testServer";
        testServer.ipAddress = new IPAddress("127.0.0.1", mockWebServer.getPort());
        testServer.setupConnectionManager();
        testServer.getConnectionManager().setSocketUUID(socketUUID);

        String serverUrl = mockWebServer.url("/api/v1/server/socket/" + socketUUID).toString();



        // Set up a mock response for the WebSocket connection
        MockResponse mockResponse = new MockResponse()
                .withWebSocketUpgrade(new WebSocketListener() {
                    @Override
                    public void onOpen(WebSocket socket, Response response) {
                        // Handle WebSocket open event
                        webSocket = socket;
                    }

                    @Override
                    public void onMessage(WebSocket webSocket, String text) {
                        // Handle WebSocket message event
                        WebsocketListenerMessageEvents.emit("message", text);
                    }

                    @Override
                    public void onClosing(WebSocket webSocket, int code, String reason) {
                        // Handle WebSocket closing event
                        WebsocketListenerMessageEvents.emit("close", code, reason);
                    }

                    @Override
                    public void onFailure(WebSocket webSocket, Throwable t, Response response) {
                        // Handle WebSocket failure event
                        WebsocketListenerMessageEvents.emit("failure", t, response);
                    }
                });
        mockWebServer.enqueue(mockResponse);

        testServer.getConnectionManager().createWebSocketClient(true);
    }

    @After
    public void tearDown() throws IOException {
        try {
            mockWebServer.shutdown();
        } catch (Exception ignored) {}

        try {
            testServer.delete();
        } catch (Exception ignored) {}
    }

    @Test
    public void echo() throws Exception {
        JsonObject data = new JsonObject();
        data.addProperty("abc123", "123456");
        data.addProperty("randomUUID", UUID.randomUUID().toString());
        data.addProperty("boolean", false);
        data.addProperty("number", 123);

        JsonObject request = new JsonObject();
        request.addProperty("command", "/api/v1/echo");
        request.addProperty("data", data.toString());



        while (webSocket == null) {
            Thread.sleep(100);
        }

        webSocket.send(request.toString());

        AtomicBoolean hasActuallyTested = new AtomicBoolean(false);
        WebsocketListenerMessageEvents.once("message", (ICallback) params -> {
            String response = (String) params[0];
            JsonObject responseJson = JsonParser.parseString(response).getAsJsonObject();
            String responseDataString = responseJson.get("data").getAsString();
            JsonObject responseData = JsonParser.parseString(responseDataString).getAsJsonObject();

            assertEquals(responseJson.get("command").toString(), "\"/api/v1/echoed\"");
            assertEquals(responseData.get("abc123").getAsString(), data.get("abc123").getAsString());
            assertEquals(responseData.get("randomUUID").getAsString(), data.get("randomUUID").getAsString());
            assertEquals(responseData.get("boolean").getAsBoolean(), data.get("boolean").getAsBoolean());
            assertEquals(responseData.get("number").getAsInt(), data.get("number").getAsNumber());

            hasActuallyTested.set(true);
        });

        int waitCount = 0;
        while (!hasActuallyTested.get() && waitCount < 10) { // wait 100*10 = 1 second
            Thread.sleep(100);
            waitCount++;
        }

        if (!hasActuallyTested.get())
            throw new Exception("Test did not run."); // Test did NOT run!
    }
}