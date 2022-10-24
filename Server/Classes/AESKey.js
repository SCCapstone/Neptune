class AESKey {

    /** @typedef {byte[]} */
    #key;
    /** @typedef {btye[]} */
    #iv;

    /**
     * This is the contructor
     * @param {byte[]} key 
     * @param {byte[]} iv 
     */
    constructor(key, iv) {

    }

    /**
     * This will return the key
     * @return {byte[]}
     */
    getKey() {
        return;
    }

    /**
     * This will return the IV
     * @returns {btye[]}
     */
    getIV() {
        return;
    }
}

modules.export = AESKey;