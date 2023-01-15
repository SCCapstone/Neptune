package com.neptune.app;

import static org.junit.Assert.assertArrayEquals;
import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotEquals;

import android.util.Log;

import com.neptune.app.Backend.AESKey;
import com.neptune.app.Backend.NeptuneCrypto;

import org.junit.Test;

import java.nio.charset.StandardCharsets;
import java.security.InvalidAlgorithmParameterException;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.util.Arrays;

import javax.crypto.BadPaddingException;
import javax.crypto.Cipher;
import javax.crypto.IllegalBlockSizeException;
import javax.crypto.NoSuchPaddingException;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;


public class NeptuneCryptoTest {
    @Test
    public void randomString_CorrectLength() {
        // Can I generate a random string of a given length?
        assertEquals(42, NeptuneCrypto.randomString(42).length());
    }
    @Test
    public void randomString_CanClamp() {
        // Testing the random string method limits the character range, 51 is the char code for 3
        // I should get a string of length 10 that's choosing a random character between code 51 and 51. (3)
        assertEquals("3333333333", NeptuneCrypto.randomString(10, 51, 51));
    }
    @Test
    public void randomString_Different() {
        // Theoretically these _could_ fail, but it's really really unlikely.
        assertNotEquals(NeptuneCrypto.randomString(50), NeptuneCrypto.randomString(50));
        assertNotEquals(NeptuneCrypto.randomString(10), NeptuneCrypto.randomString(11));
    }


    // HEX checking
    @Test
    public void stringToHexToString() {
        String hexData = NeptuneCrypto.convertStringToHex("This is a simple test");
        assertEquals("This is a simple test", NeptuneCrypto.convertHexToString(hexData));
    }
    @Test
    public void stringToHexToBytes() {
        String hexData = NeptuneCrypto.convertStringToHex("This is a simple test");
        assertArrayEquals("This is a simple test".getBytes(StandardCharsets.UTF_8), NeptuneCrypto.convertHexToBytes(hexData));
    }
    @Test
    public void bytesToHexToBytes() {
        byte[] bytes = "This is a simple test".getBytes(StandardCharsets.UTF_8);
        String hexData = NeptuneCrypto.convertBytesToHex(bytes);
        assertArrayEquals(bytes, NeptuneCrypto.convertHexToBytes(hexData));
    }
    @Test
    public void bytesToHexToString() {
        byte[] bytes = "This is a simple test".getBytes(StandardCharsets.UTF_8);
        String hexData = NeptuneCrypto.convertBytesToHex(bytes);
        assertEquals("This is a simple test", NeptuneCrypto.convertHexToString(hexData));
    }


    // Base64 checking
    @Test
    public void stringToBase64ToString() {
        String base64Data = NeptuneCrypto.convertStringToBase64("This is a simple test");
        assertEquals("This is a simple test", NeptuneCrypto.convertBase64ToString(base64Data));
    }
    @Test
    public void stringToBase64ToBytes() {
        String base64Data = NeptuneCrypto.convertStringToBase64("This is a simple test");
        assertArrayEquals("This is a simple test".getBytes(StandardCharsets.UTF_8), NeptuneCrypto.convertBase64ToBytes(base64Data));
    }
    @Test
    public void bytesToBase64ToBytes() {
        byte[] bytes = "This is a simple test".getBytes(StandardCharsets.UTF_8);
        String base64Data = NeptuneCrypto.convertBytesToBase64(bytes);
        assertArrayEquals(bytes, NeptuneCrypto.convertBase64ToBytes(base64Data));
    }
    @Test
    public void bytesToBase64ToString() {
        byte[] bytes = "This is a simple test".getBytes(StandardCharsets.UTF_8);
        String base64Data = NeptuneCrypto.convertBytesToBase64(bytes);
        assertEquals("This is a simple test", NeptuneCrypto.convertBase64ToString(base64Data));
    }


    // Encryption decryption checking
    //ChaCha20
    @Test
    public void encryptionDecryption_ChaCha20Poly1305() throws NoSuchPaddingException, NoSuchAlgorithmException, InvalidAlgorithmParameterException, InvalidKeyException {
        NeptuneCrypto.CipherData cipherData = new NeptuneCrypto.CipherData("chacha20-poly1305", "sha256");
        SecretKey key = new SecretKeySpec("1234".getBytes(StandardCharsets.UTF_8), cipherData.family);

        String cipherText = NeptuneCrypto.encrypt("This is a sample message", key, null, cipherData);
        assertEquals("This is a sample message", NeptuneCrypto.decrypt(cipherText, key));
    }
    @Test
    public void encryptionDecryption_ChaCha20() throws NoSuchPaddingException, NoSuchAlgorithmException, InvalidAlgorithmParameterException, InvalidKeyException {
        NeptuneCrypto.CipherData cipherData = new NeptuneCrypto.CipherData("chacha20", "sha256");
        SecretKey key = new SecretKeySpec("1234".getBytes(StandardCharsets.UTF_8), cipherData.family);

        String cipherText = NeptuneCrypto.encrypt("This is a sample message", key, null, cipherData);
        assertEquals("This is a sample message", NeptuneCrypto.decrypt(cipherText, key));
    }

    // AES GCM
    @Test
    public void encryptionDecryption_AES256GCM() throws NoSuchPaddingException, NoSuchAlgorithmException, InvalidAlgorithmParameterException, InvalidKeyException {
        NeptuneCrypto.CipherData cipherData = new NeptuneCrypto.CipherData("aes-256-gcm", "sha256");
        SecretKey key = new SecretKeySpec("1234".getBytes(StandardCharsets.UTF_8), cipherData.family);

        String cipherText = NeptuneCrypto.encrypt("This is a sample message", key, null, cipherData);
        assertEquals("This is a sample message", NeptuneCrypto.decrypt(cipherText, key));
    }
    @Test
    public void encryptionDecryption_AES128GCM() throws NoSuchPaddingException, NoSuchAlgorithmException, InvalidAlgorithmParameterException, InvalidKeyException {
        NeptuneCrypto.CipherData cipherData = new NeptuneCrypto.CipherData("aes-128-gcm", "sha256");
        SecretKey key = new SecretKeySpec("1234".getBytes(StandardCharsets.UTF_8), cipherData.family);

        String cipherText = NeptuneCrypto.encrypt("This is a sample message", key, null, cipherData);
        assertEquals("This is a sample message", NeptuneCrypto.decrypt(cipherText, key));
    }
    @Test
    public void canEncryptDecrypt_AES256GCM() throws NoSuchPaddingException, NoSuchAlgorithmException, InvalidAlgorithmParameterException, InvalidKeyException, IllegalBlockSizeException, BadPaddingException {
        NeptuneCrypto.CipherData cipherData = new NeptuneCrypto.CipherData("aes-256-gcm", "sha256");
        SecretKey key = new SecretKeySpec("1234".getBytes(StandardCharsets.UTF_8), cipherData.family);
        NeptuneCrypto.HKDFOptions hkdfOptions =  new NeptuneCrypto.HKDFOptions(cipherData);
        AESKey encryptionKey = NeptuneCrypto.HKDF(key, NeptuneCrypto.randomString(32), hkdfOptions);

        String AAD = NeptuneCrypto.randomString(16);

        Cipher cipher = Cipher.getInstance("AES_256/GCM/NoPadding");

        GCMParameterSpec spec = new GCMParameterSpec(128, encryptionKey.getIv());
        cipher.init(Cipher.ENCRYPT_MODE, encryptionKey.getKey(), spec);
        cipher.updateAAD(AAD.getBytes(StandardCharsets.UTF_8));
        byte[] result = cipher.doFinal("This is a test".getBytes(StandardCharsets.UTF_8));
        byte[] encryptedData = Arrays.copyOfRange(result, 0, "This is a test".length());
        byte[] tag = Arrays.copyOfRange(result, "This is a test".length(), result.length);

        Cipher decryptionCipher = Cipher.getInstance("AES_256/GCM/NoPadding");
        cipher.init(Cipher.DECRYPT_MODE, encryptionKey.getKey(), spec);
        cipher.updateAAD(AAD.getBytes(StandardCharsets.UTF_8));
        cipher.update(encryptedData);
        String data = new String(cipher.doFinal(tag));

        assertEquals("This is a test", data);
    }


    // AES CBC
    @Test
    public void encryptionDecryption_AES256CBC() throws NoSuchPaddingException, NoSuchAlgorithmException, InvalidAlgorithmParameterException, InvalidKeyException {
        NeptuneCrypto.CipherData cipherData = new NeptuneCrypto.CipherData("aes-256-cbc", "sha256");
        SecretKey key = new SecretKeySpec("1234".getBytes(StandardCharsets.UTF_8), cipherData.family);

        String cipherText = NeptuneCrypto.encrypt("This is a sample message", key, null, cipherData);
        assertEquals("This is a sample message", NeptuneCrypto.decrypt(cipherText, key));
    }
    @Test
    public void encryptionDecryption_AES128CBC() throws NoSuchPaddingException, NoSuchAlgorithmException, InvalidAlgorithmParameterException, InvalidKeyException {
        NeptuneCrypto.CipherData cipherData = new NeptuneCrypto.CipherData("aes-128-cbc", "sha256");
        SecretKey key = new SecretKeySpec("1234".getBytes(StandardCharsets.UTF_8), cipherData.family);

        String cipherText = NeptuneCrypto.encrypt("This is a sample message", key, null, cipherData);
        assertEquals("This is a sample message", NeptuneCrypto.decrypt(cipherText, key));
    }
}