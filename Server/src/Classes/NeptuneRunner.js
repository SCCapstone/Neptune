/**
 *      _  _ 
 *     | \| |
 *     | .` |
 *     |_|\_|eptune
 *
 * 		Capstone Project 2022
 */
const EventEmitter = require('node:events');
const net = require('net');
const { platform } = require('node:os');





// Events: data <PipeDataReceivedEventArgs>


class PipeDataReceivedEventArgs {
    /** @type {string} */
    Data;

    /**
     * Command, what this data is for
     * @type {string}
     */
    Command;

    /** @param {string} data */
    constructor(data) {
        if (typeof data !== "string")
            throw new TypeError("data expected string got " + (typeof data).toString());
        if (data.startsWith('\x02'))
            data = data.substring(1);
        if (data.startsWith('\x03'))
            data = data.substring(0, data.length-1);

        this.Data = data;

        // grab command
        let dataSplit = this.Data.split('\x1e');
        if (dataSplit.length >= 1) {
            let keyValue = dataSplit[0].split('\x1f');
            if (keyValue.length >= 1) {
                this.Command = keyValue[0];
            }
        }


    }
    /** @return {object} */
    toDictionary() {
        let result = {}
        let dataSplit = this.Data.split('\x1e');
        for (var i = 0; i<dataSplit.length; i++) {
            let keyValue = dataSplit[i].split('\x1f');
            if (keyValue.length >= 2) {
                result[keyValue[0]] = keyValue[1];
            }
        }
        return result
    }
}

/**
 * 
 * 
 * @fires NeptuneRunnerIPC#data
 * @fires NeptuneRunnerIPC#end
 * @fires NeptuneRunnerIPC#authenticated
 * 
 */
class NeptuneRunnerIPC extends EventEmitter {
    #pipePath = '\\\\.\\pipe\\';
    #pipeName = 'NeptuneRunnerIPC';
    #pipeServerKey = "BigweLQytERRx243O5otGgm8UsBhrdVE"; // Server's key
    #pipeClientKey = "kBoWq2BtM2yqfCntSnLUe6I7lZVjwyEl"; // Our key
    #pipeAuthenticated = false;
    get pipeAuthenticated() {
        return this.#pipeAuthenticated;
    }

    log;

    /**
     * @type {net.Socket}
     */
    pipe;

    constructor() {
        super();
        //if (process.platform !== "win32")
        //    throw new Error("Operating system not supported.");

        this.log = Neptune.logMan.getLogger("NR-Pipe");
        try {
            this.pipe = net.createConnection(this.#pipePath + this.#pipeName, () => {
                this.log.info("Connected to NeptuneRunner, sending CKey.");

                if (!this.#pipeAuthenticated) {
                    this.pipe.write("\x02ckey\x1f" + this.#pipeClientKey + "\x1e\x03");
                }
            });

            this.pipe.on('error', (err) => {
                this.log.error("Failed to connect to NeptuneRunner pipe, is it running?");
                this.log.error(err, false);
            });

            this.pipe.on('data', (data) => {
                if (!this.#pipeAuthenticated) {
                    if (data == "\x02skey\x1f" + this.#pipeServerKey + "\x1e\x03") {
                        this.log.debug("Authenticated.");
                        this.#pipeAuthenticated = true

                        /**
                         * @event NeptuneRunnerIPC#authenticated
                         * @type {undefined}
                         */
                        this.emit("authenticated")
                    } else {
                        this.log.debug("Unable to authenticate pipe! Data: " + data.toString());
                    }
                } else {
                    this.log.debug("Received: " + data.toString());
                    let dataProcessed = new PipeDataReceivedEventArgs(data.toString());

                    if (dataProcessed.Command == "notify-dismissed" || dataProcessed.Command == "notify-failed" || dataProcessed.Command == "notify-activated") {
                        let dataParameters = dataProcessed.toDictionary();
                        let eventString = 'notify-id_' + dataParameters.id;
                        if (dataParameters.clientId !== undefined && dataParameters.id !== undefined) {
                            eventString = 'notify-client_' + dataParameters.clientId + ":" + dataParameters.id
                        }
                        this.emit(eventString, dataProcessed);
                    } else {
                        /**
                         * Received data from NeptuneRunner
                         * @event NeptuneRunnerIPC#data
                         * @type {PipeDataReceivedEventArgs}
                         */
                        this.emit('data', dataProcessed);
                    }
                }
            });

            this.pipe.on('end', () => {
                this.log.warn('Disconnected from NeptuneRunner.');
                /**
                 * @event NeptuneRunnerIPC#end
                 * @type {undefined}
                 */
                this.emit("end");
            });
        } catch (e) {
            this.log.error('Catastrophic error on NeptuneRunnerIPC setup.');
        }
    }


    flattenObject(obj, prefix = "", delimiter = "|", result = {}) {
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                const newKey = prefix ? `${prefix}${delimiter}${key}` : key;
                const value = obj[key];

                if (value !== null && value !== undefined) {
                    if (typeof value === "object" && !Array.isArray(value)) {
                        flattenObject(value, newKey, delimiter, result);
                    } else {
                        result[newKey] = value;
                    }
                }
            }
        }
        return result;
    }


    sendData(command, data) {
        //if (process.platform !== "win32")
        //    return;

        if (typeof command === "string" && data === undefined) {
            this.pipe.write(command);
            return;
        } else if (typeof command === "string" && typeof data === "object") {
            // Flatten the incoming object, (no child objects!)
            let flattenedData = this.flattenObject(data);


            let dataString = '\x02' + command + "\x1f\x1e";
            let keys = Object.keys(flattenedData);
            for (var i = 0; i<keys.length; i++) {
                dataString += keys[i];
                dataString += '\x1f';
                if (flattenedData[keys[i]] !== undefined) {
                    dataString += flattenedData[keys[i]];
                }
                dataString += '\x1e';
            }
            dataString += '\x03'
            this.log.silly(dataString);
            this.pipe.write(dataString);
        } else {
            throw new TypeError("data expected string or object (key value pair) got " + (typeof data).toString());
        }
    }
}


module.exports = {
    NeptuneRunnerIPC: NeptuneRunnerIPC,
    PipeDataReceivedEventArgs: PipeDataReceivedEventArgs
}