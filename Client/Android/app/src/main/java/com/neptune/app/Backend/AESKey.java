package com.neptune.app.Backend;

public class AESKey {
    /**
     * AES Key
     */
    private byte[] key;

    /**
     * AES Initialization Vector
     */
    private byte[] iv;

    /**
     * Create new AESKey package
     * @param key AES secret key
     * @param iv AES initialization vector
     */
    public AESKey(byte[] key, byte[] iv) {
        this.iv = iv;
        this.key = key;
    }

    /**
     * Gets the AES Key
     * @return AES secret key
     */
    public byte[] getKey() {
        return key;
    }

    /**
     * Gets the AES Initialization Vector
     * @return AES IV
     */
    public byte[] getIv() {
        return iv;
    }
}
