package com.neptune.app;

import static org.junit.Assert.assertArrayEquals;
import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotEquals;

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
import javax.crypto.spec.IvParameterSpec;
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


    // HKDF key generation
    @Test
    public void hkdf_GeneratesSameKey() throws NoSuchPaddingException, NoSuchAlgorithmException {
        NeptuneCrypto.CipherData cipherData = new NeptuneCrypto.CipherData("chacha20-poly1305", "sha256");
        SecretKey key = new SecretKeySpec("1234".getBytes(StandardCharsets.UTF_8), cipherData.family);
        NeptuneCrypto.HKDFOptions hkdfOptions =  new NeptuneCrypto.HKDFOptions(cipherData);
        AESKey encryptionKey1 = NeptuneCrypto.HKDF("1234", "(*)jugm)OA=]BA+>_j>} -B(=K[tbK]+");
        byte[] ourKey1 = encryptionKey1.getKey().getEncoded();

        AESKey encryptionKey2 = NeptuneCrypto.HKDF(key, "(*)jugm)OA=]BA+>_j>} -B(=K[tbK]+", hkdfOptions);
        byte[] ourKey2 = encryptionKey2.getKey().getEncoded();
        assertArrayEquals(ourKey1, ourKey2);
    }
    @Test
    public void hkdf_GeneratesSameKeySameIv() throws NoSuchPaddingException, NoSuchAlgorithmException {
        NeptuneCrypto.CipherData cipherData = new NeptuneCrypto.CipherData("chacha20-poly1305", "sha256");
        SecretKey key = new SecretKeySpec("1234".getBytes(StandardCharsets.UTF_8), cipherData.family);

        NeptuneCrypto.HKDFOptions hkdfOptions =  new NeptuneCrypto.HKDFOptions(cipherData, false);
        AESKey encryptionKey1 = NeptuneCrypto.HKDF("1234", "(*)jugm)OA=]BA+>_j>} -B(=K[tbK]+", hkdfOptions);
        byte[] ourKey1 = encryptionKey1.getKey().getEncoded();
        byte[] ourIv1 = encryptionKey1.getIv();

        AESKey encryptionKey2 = NeptuneCrypto.HKDF(key, "(*)jugm)OA=]BA+>_j>} -B(=K[tbK]+", hkdfOptions);
        byte[] ourKey2 = encryptionKey2.getKey().getEncoded();
        byte[] ourIv2 = encryptionKey2.getIv();
        assertArrayEquals(ourKey1, ourKey2);
        assertArrayEquals(ourIv1, ourIv2);
    }
    @Test
    public void hkdf_VerifyKeyGeneration() throws NoSuchPaddingException, NoSuchAlgorithmException {
        NeptuneCrypto.CipherData cipherData = new NeptuneCrypto.CipherData("chacha20-poly1305", "sha256");
        SecretKey key = new SecretKeySpec("1234".getBytes(StandardCharsets.UTF_8), cipherData.family);
        // Created via server, known good
        byte[] goodKey = NeptuneCrypto.convertHexToBytes("e1de998fa0d81dc5c51151d9cf95f5a4902492a609d3f0bbcda81478828f3707");

        NeptuneCrypto.HKDFOptions hkdfOptions =  new NeptuneCrypto.HKDFOptions(cipherData);
        AESKey encryptionKey = NeptuneCrypto.HKDF(key, "(*)jugm)OA=]BA+>_j>} -B(=K[tbK]+", hkdfOptions);
        byte[] ourKey = encryptionKey.getKey().getEncoded();
        assertArrayEquals(goodKey, ourKey);
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
    public void canDecrypt_ChaCha20Poly1305() throws NoSuchPaddingException, NoSuchAlgorithmException {
        NeptuneCrypto.CipherData cipherData = new NeptuneCrypto.CipherData("chacha20-poly1305", "sha256");
        SecretKey key = new SecretKeySpec("1234".getBytes(StandardCharsets.UTF_8), cipherData.family);

        // Provided by Neptune Server
        String savedNCryptString = "ncrypt::1:chacha20-poly1305:sha256:TXlSYW5kb21TYWx0:PEIrS2pcYXcoMTBscFQrTA==:5c7c595123573536407c2326:YAasL64QULUgXRxoCJGsd+pZzc71j4md:JlRgVD4zKHF7Rnc7KSw4Kw==:a2a97395d037cc554fe765272ffae9c8";
        assertEquals("This is a sample message", NeptuneCrypto.decrypt(savedNCryptString, key));
    }

    @Test
    public void canEncryptDecrypt_ChaCha20Poly1305() throws Exception {
        NeptuneCrypto.CipherData cipherData = new NeptuneCrypto.CipherData("chacha20-poly1305", "sha256");
        SecretKeySpec key = new SecretKeySpec("1234".getBytes(StandardCharsets.UTF_8), cipherData.family);
        NeptuneCrypto.HKDFOptions hkdfOptions =  new NeptuneCrypto.HKDFOptions(cipherData);
        AESKey encryptionKey = NeptuneCrypto.HKDF(key, NeptuneCrypto.randomString(32), hkdfOptions);
        IvParameterSpec ivParameterSpec = new IvParameterSpec(encryptionKey.getIv());

        String AAD = NeptuneCrypto.randomString(16);

        Cipher cipher = Cipher.getInstance("ChaCha20-Poly1305/None/NoPadding");
        cipher.init(Cipher.ENCRYPT_MODE, encryptionKey.getKey(), ivParameterSpec); // Works .. no idea why
        cipher.updateAAD(AAD.getBytes(StandardCharsets.UTF_8));
        byte[] cipherText = cipher.doFinal("This is a test".getBytes(StandardCharsets.UTF_8));

        cipher = Cipher.getInstance("ChaCha20-Poly1305/None/NoPadding");
        cipher.init(Cipher.DECRYPT_MODE, encryptionKey.getKey(), ivParameterSpec);
        cipher.updateAAD(AAD.getBytes(StandardCharsets.UTF_8));
        byte[] decryptedText = cipher.doFinal(cipherText);
        assertEquals("This is a test", new String(decryptedText, StandardCharsets.UTF_8));
    }


//    @Test
//    public void encryptionDecryption_ChaCha20() throws NoSuchPaddingException, NoSuchAlgorithmException, InvalidAlgorithmParameterException, InvalidKeyException {
//        NeptuneCrypto.CipherData cipherData = new NeptuneCrypto.CipherData("chacha20", "sha256");
//        SecretKey key = new SecretKeySpec("1234".getBytes(StandardCharsets.UTF_8), cipherData.family);
//
//        String cipherText = NeptuneCrypto.encrypt("This is a sample message", key, null, cipherData);
//        assertEquals("This is a sample message", NeptuneCrypto.decrypt(cipherText, key));
//    }
//    @Test
//    public void canEncryptDecrypt_ChaCha20() throws Exception {
//        NeptuneCrypto.CipherData cipherData = new NeptuneCrypto.CipherData("chacha20", "sha256");
//        SecretKeySpec key = new SecretKeySpec("1234".getBytes(StandardCharsets.UTF_8), cipherData.family);
//        NeptuneCrypto.HKDFOptions hkdfOptions =  new NeptuneCrypto.HKDFOptions(cipherData);
//        AESKey encryptionKey = NeptuneCrypto.HKDF(key, NeptuneCrypto.randomString(32), hkdfOptions);
//
//
//        Cipher cipher = Cipher.getInstance("ChaCha20/None/NoPadding");
//        cipher.init(Cipher.ENCRYPT_MODE, encryptionKey.getKey()); // cannot use: , ivParameterSpec); // Implodes :(
//        // See: https://openjdk.org/jeps/329#:~:text=may%20be%20initialized-,without,-an%20IvParameterSpec%2C%20in
//        byte[] cipherText = cipher.doFinal("This is a test".getBytes(StandardCharsets.UTF_8));
//        encryptionKey = new AESKey(encryptionKey.getKey(), cipher.getIV()); // cipher creates it's own IV
//
//        cipher = Cipher.getInstance("ChaCha20/None/NoPadding");
//        AlgorithmParameterSpec ivParameterSpec = new IvParameterSpec(encryptionKey.getIv());
//        cipher.init(Cipher.DECRYPT_MODE, encryptionKey.getKey(), ivParameterSpec); // see above... no way around :/
//        byte[] decryptedText = cipher.doFinal(cipherText);
//        assertEquals("This is a test", new String(decryptedText, StandardCharsets.UTF_8));
//    }


    // AES GCM
    @Test
    public void encryptionDecryption_AES256GCM() throws NoSuchPaddingException, NoSuchAlgorithmException, InvalidAlgorithmParameterException, InvalidKeyException {
        NeptuneCrypto.CipherData cipherData = new NeptuneCrypto.CipherData("aes-256-gcm", "sha256");
        SecretKey key = new SecretKeySpec("1234".getBytes(StandardCharsets.UTF_8), cipherData.family);

        String cipherText = NeptuneCrypto.encrypt("This is a sample message", key, null, cipherData);
        assertEquals("This is a sample message", NeptuneCrypto.decrypt(cipherText, key));
    }
    @Test
    public void canDecrypt_AES256GCM() throws NoSuchPaddingException, NoSuchAlgorithmException {
        NeptuneCrypto.CipherData cipherData = new NeptuneCrypto.CipherData("aes-256-gcm", "sha256");
        SecretKey key = new SecretKeySpec("1234".getBytes(StandardCharsets.UTF_8), cipherData.family);

        String cipherText = "ncrypt::1:aes-256-gcm:sha256:TXlSYW5kb21TYWx0:NEMrWGVGMHV0SmRMXDt5SA==:6a703f346a326e3935755959774a6a74:CB6uO9s8Wv1HbGTcUoOfHCXn5We/VKrh:T0dqLCZrcC9jcn1PZEhtJw==:f5b972e9127eba3f25632bbaf341cb0a";
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
    public void canDecrypt_AES128GCM() throws NoSuchPaddingException, NoSuchAlgorithmException {
        NeptuneCrypto.CipherData cipherData = new NeptuneCrypto.CipherData("aes-256-gcm", "sha256");
        SecretKey key = new SecretKeySpec("1234".getBytes(StandardCharsets.UTF_8), cipherData.family);

        String cipherText = "ncrypt::1:aes-128-gcm:sha256:TXlSYW5kb21TYWx0:WCpdKTBLOmk+L399U3FdeQ==:6c274971646434236e5666345a3e3d4a:kpdtzCf93iwEU+q4Pq9cYWhWvNS9Bkrx:L2xQajc/QkBjcXVqazhoNg==:5c579dd3c58a9119fc0aa85f362dc887";
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

        cipher.init(Cipher.DECRYPT_MODE, encryptionKey.getKey(), spec);
        cipher.updateAAD(AAD.getBytes(StandardCharsets.UTF_8));
        cipher.update(encryptedData);
        String data = new String(cipher.doFinal(tag));

        assertEquals("This is a test", data);
    }


    // AES CBC
//    @Test
//    public void encryptionDecryption_AES256CBC() throws NoSuchPaddingException, NoSuchAlgorithmException, InvalidAlgorithmParameterException, InvalidKeyException {
//        NeptuneCrypto.CipherData cipherData = new NeptuneCrypto.CipherData("aes-256-cbc", "sha256");
//        SecretKey key = new SecretKeySpec("1234".getBytes(StandardCharsets.UTF_8), cipherData.family);
//
//        String cipherText = NeptuneCrypto.encrypt("This is a sample message", key, null, cipherData);
//        assertEquals("This is a sample message", NeptuneCrypto.decrypt(cipherText, key));
//    }
//    @Test
//    public void encryptionDecryption_AES128CBC() throws NoSuchPaddingException, NoSuchAlgorithmException, InvalidAlgorithmParameterException, InvalidKeyException {
//        NeptuneCrypto.CipherData cipherData = new NeptuneCrypto.CipherData("aes-128-cbc", "sha256");
//        SecretKey key = new SecretKeySpec("1234".getBytes(StandardCharsets.UTF_8), cipherData.family);
//
//        String cipherText = NeptuneCrypto.encrypt("This is a sample message", key, null, cipherData);
//        assertEquals("This is a sample message", NeptuneCrypto.decrypt(cipherText, key));
//    }



    // Malformed data
    @Test
    public void encryptionDecryption_CanCatchIncorrectSplit() throws NoSuchPaddingException, NoSuchAlgorithmException {
        NeptuneCrypto.CipherData cipherData = new NeptuneCrypto.CipherData("chacha20-poly1305", "sha256");
        SecretKey key = new SecretKeySpec("1234".getBytes(StandardCharsets.UTF_8), cipherData.family);

        int count = 0;

        // Note the data is invalid and will not decrypt.
        String tooFew = "ncrypt::1:chacha20-poly1305sha256:TXlSYW5kb21TYWx0:PEIrS2pcYXcoMTBscFQrTA==:5c7c595123573536407c2326:YAasL64QULUgXRxoCJGsd+pZzc71j4md:JlRgVD4zKHF7Rnc7KSw4Kw==:a2a97395d037cc554fe765272ffae9c8";
        String tooMany = "ncrypt::1:aes-128-cbc:sha256:TXlSYW5kb21TYWx0:PEIrS2pcYXcoMTBscFQrTA==:5c7c595123573536407c2326:YAasL64QULUgXRxoCJGsd+pZzc71j4md:JlRgVD4zKHF7Rnc7KSw4Kw==:a2a97395d037cc554fe765272ffae9c8";
        try {
            NeptuneCrypto.decrypt(tooFew, key);
        } catch (NeptuneCrypto.EncryptedDataSplitError err) {
            count++;
        }

        try {
            NeptuneCrypto.decrypt(tooMany, key);
        } catch (NeptuneCrypto.EncryptedDataSplitError err) {
            count++;
        }


        assertEquals(2, count);
    }
    @Test // Unknown ncrypt version
    public void encryptionDecryption_CanCatchIncorrectVersion() throws NoSuchPaddingException, NoSuchAlgorithmException {
        NeptuneCrypto.CipherData cipherData = new NeptuneCrypto.CipherData("chacha20-poly1305", "sha256");
        SecretKey key = new SecretKeySpec("1234".getBytes(StandardCharsets.UTF_8), cipherData.family);
        int count = 0;

        // Note the data is invalid and will not decrypt.
        String tooHigh = "ncrypt::100:aes-128-cbc:sha256:TXlSYW5kb21TYWx0:PEIrS2pcYXcoMTBscFQrTA==:5c7c595123573536407c2326:YAasL64QULUgXRxoCJGsd+pZzc71j4md";
        String tooLow = "ncrypt::0:aes-128-cbc:sha256:TXlSYW5kb21TYWx0:PEIrS2pcYXcoMTBscFQrTA==:5c7c595123573536407c2326:YAasL64QULUgXRxoCJGsd+pZzc71j4md";
        try {
            NeptuneCrypto.decrypt(tooHigh, key);
        } catch (NeptuneCrypto.EncryptedDataInvalidVersion err) {
            count++;
        }

        try {
            NeptuneCrypto.decrypt(tooLow, key);
        } catch (NeptuneCrypto.EncryptedDataInvalidVersion err) {
            count++;
        }
        assertEquals(2, count);
    }

    @Test // No prefix/wrong prefix
    public void encryptionDecryption_CanCatchNoPrefix() throws NoSuchPaddingException, NoSuchAlgorithmException {
        NeptuneCrypto.CipherData cipherData = new NeptuneCrypto.CipherData("chacha20-poly1305", "sha256");
        SecretKey key = new SecretKeySpec("1234".getBytes(StandardCharsets.UTF_8), cipherData.family);
        int count = 0;

        // Note the data is invalid and will not decrypt.
        String missing = "1:aes-128-cbc:sha256:TXlSYW5kb21TYWx0:PEIrS2pcYXcoMTBscFQrTA==:5c7c595123573536407c2326:YAasL64QULUgXRxoCJGsd+pZzc71j4md";
        String wrong = "something::1:aes-128-cbc:sha256:TXlSYW5kb21TYWx0:PEIrS2pcYXcoMTBscFQrTA==:5c7c595123573536407c2326:YAasL64QULUgXRxoCJGsd+pZzc71j4md";
        try {
            NeptuneCrypto.decrypt(missing, key);
        } catch (NeptuneCrypto.DataNotEncrypted err) {
            count++;
        }

        try {
            NeptuneCrypto.decrypt(wrong, key);
        } catch (NeptuneCrypto.DataNotEncrypted err) {
            count++;
        }
        assertEquals(2, count);
    }

    @Test // Invalid key
    public void encryptionDecryption_CanCatchUnknownCipher() throws NoSuchPaddingException, NoSuchAlgorithmException {
        NeptuneCrypto.CipherData cipherData = new NeptuneCrypto.CipherData("aes-256-gcm", "sha256");
        SecretKey key = new SecretKeySpec("NotThis".getBytes(StandardCharsets.UTF_8), cipherData.family);
        int count = 0;

        String huh = "ncrypt::1:blowfish:sha256:TXlSYW5kb21TYWx0:NEMrWGVGMHV0SmRMXDt5SA==:6a703f346a326e3935755959774a6a74:CB6uO9s8Wv1HbGTcUoOfHCXn5We/VKrh";
        try {
            NeptuneCrypto.decrypt(huh, key);
        } catch (NeptuneCrypto.UnsupportedCipher err) {
            count++;
        }

        try {
            new NeptuneCrypto.CipherData("turbocrypt", "sha256");
        } catch (NeptuneCrypto.UnsupportedCipher err) {
            count++;
        }
        assertEquals(2, count);
    }

    @Test // Unknown cipher
    public void encryptionDecryption_CanCatchWrongKey() throws NoSuchPaddingException, NoSuchAlgorithmException {
        NeptuneCrypto.CipherData cipherData = new NeptuneCrypto.CipherData("aes-256-gcm", "sha256");
        SecretKey key = new SecretKeySpec("NotThis".getBytes(StandardCharsets.UTF_8), cipherData.family);
        int count = 0;

        String cipherText = "ncrypt::1:aes-256-gcm:sha256:TXlSYW5kb21TYWx0:NEMrWGVGMHV0SmRMXDt5SA==:6a703f346a326e3935755959774a6a74:CB6uO9s8Wv1HbGTcUoOfHCXn5We/VKrh:T0dqLCZrcC9jcn1PZEhtJw==:f5b972e9127eba3f25632bbaf341cb0a";
        try {
            NeptuneCrypto.decrypt(cipherText, key);
        } catch (NeptuneCrypto.InvalidDecryptionKey err) {
            count++;
        }

        try {
            NeptuneCrypto.decrypt(cipherText, null);
        } catch (NeptuneCrypto.MissingDecryptionKey err) {
            count++;
        }
        assertEquals(2, count);
    }




    @Test // Basic encrypt decrypt
    public void encryptionDecryption_BasicMethods() throws NoSuchPaddingException, NoSuchAlgorithmException, InvalidAlgorithmParameterException, InvalidKeyException {
        SecretKey key = new SecretKeySpec("1234".getBytes(StandardCharsets.UTF_8), "ChaCha20");
        String cipherText = NeptuneCrypto.encrypt("This is a sample message", key);
        assertEquals("This is a sample message", NeptuneCrypto.decrypt(cipherText, key));
    }
}