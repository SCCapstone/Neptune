package com.neptune.app;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotEquals;

import android.util.Log;

import com.neptune.app.Backend.NeptuneCrypto;

import org.junit.Test;

import java.nio.charset.StandardCharsets;
import java.security.InvalidAlgorithmParameterException;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;

import javax.crypto.NoSuchPaddingException;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;


public class NeptuneCryptoTest {
    @Test
    public void randomString_CorrectLength() {
        assertEquals(42, NeptuneCrypto.randomString(42).length());
    }
    @Test
    public void randomString_CanClamp() {
        assertEquals("3333333333", NeptuneCrypto.randomString(10, 51, 51));
    }
    @Test
    public void randomString_Different() {
        assertNotEquals(NeptuneCrypto.randomString(50), NeptuneCrypto.randomString(50));
        assertNotEquals(NeptuneCrypto.randomString(10), NeptuneCrypto.randomString(11));
    }


    @Test
    public void encryptionDecryption() throws NoSuchPaddingException, NoSuchAlgorithmException, InvalidAlgorithmParameterException, InvalidKeyException {
        NeptuneCrypto.CipherData cipherData = new NeptuneCrypto.CipherData("aes-256-gcm", "sha256");
        SecretKey key = new SecretKeySpec("1234".getBytes(StandardCharsets.UTF_8), cipherData.family);

        String cipherText = NeptuneCrypto.encrypt("This is a sample message", key, null, cipherData);
        assertEquals("This is a sample message", NeptuneCrypto.decrypt(cipherText, key));
    }
}