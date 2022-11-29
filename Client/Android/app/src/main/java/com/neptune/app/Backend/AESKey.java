package com.neptune.app.Backend;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;

public class AESKey {
    /**
     * AES Key
     */
    private final SecretKey key;

    /**
     * AES Initialization Vector
     */
    private final byte[] iv;

    /**
     * Create new AESKey package
     *
     * @param key AES secret key
     * @param iv  AES initialization vector
     */
    public AESKey(byte[] key, byte[] iv, String keyAlgorithm) {
        this.iv = iv;
        this.key = new SecretKeySpec(key, (keyAlgorithm.isEmpty()) ? keyAlgorithm : "AES");
    }

    public AESKey(SecretKey key, byte[] iv) {
        this.iv = iv;
        this.key = key;
    }

    /**
     * Gets the AES Key
     *
     * @return AES secret key
     */
    public SecretKey getKey() {
        return key;
    }

    /**
     * Gets the AES Initialization Vector
     *
     * @return AES IV
     */
    public byte[] getIv() {
        return iv;
    }
}
