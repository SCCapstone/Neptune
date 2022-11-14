const NeptuneWindow = require("./NeptuneWindow");

class ConnectionDetails extends NeptuneWindow {

    constructor(arg) {
        super(arg);

        this.setWindowTitle("Connection Details");
        this.resize(400, 200);
        
    }
}