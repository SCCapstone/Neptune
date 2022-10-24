import android.app.Notification;

import org.json.JSONObject;

public class Server {
    private IPAddress ipAddress;
    private ConnectionManager connectionManager;
    private ConfigItem configuartion;
    private String serverId;
    private String name;
    private String friendlyName;
    private DateTime dateAdded;
    private String[] notifiableApps;

    public Server server() {

        return null;
    }

    public Server server(JSONObject jsonObject) {

        return null;
    }

    public boolean sendNotification(Notification notification) {

        return false;
    }

    public boolean sendClipboard(Object object ) {

        return false;
    }

    public boolean sendFile(String file) {

        return false;
    }

    public boolean sendPing() {

        return false;
    }

    public IPAddress setIPAddress() {

        return null;
    }

    public IPAddress getIpAddress() {

        return null;
    }

    public boolean unpair() {

        return false;
    }

    public boolean pair() {

        return false;
    }

    public JSONObject toJSON() {

        return null;
    }

    public boolean saveConfiguration() {

        return false;
    }

}
