package com.neptune.app.Backend;

// Pulled from the Server NeptuneCrypto file

import android.os.Build;
import android.util.Base64;

import androidx.annotation.NonNull;

import java.nio.charset.StandardCharsets;
import java.security.InvalidAlgorithmParameterException;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Arrays;

import javax.crypto.BadPaddingException;
import javax.crypto.Cipher;
import javax.crypto.IllegalBlockSizeException;
import javax.crypto.NoSuchPaddingException;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.IvParameterSpec;
import javax.crypto.spec.SecretKeySpec;
//import javax.crypto.spec.ChaCha20ParameterSpec;
import java.security.spec.AlgorithmParameterSpec;

import at.favre.lib.crypto.HKDF;

public class NeptuneCrypto {
    // Do not touch, prefix used to tell the decryption method that this string, is in fact, encrypted.
    public static String encryptedPrefix = "ncrypt::";

    public static class CipherData {
        // algorithm: [keyLenght (bytes), iv/secondary (bytes)]
        public static int[] chaCha20Poly1305 = {32, 12}; // 256 bit key, 96 bit nonce
        public static int[] chaCha20 = {32, 12}; // 256 bit key, 96 bit nonce
        public static int[] aes256 = {32, 16}; // 256 bit key, 128 bit iv
        public static int[] aes192 = {24, 16};
        public static int[] aes128 = {16, 16};

        // Pass this to Cipher.getInstance to get the cipher instance
        public String cipherTransformation = "ChaCha20/None/NoPadding";
        // Length of the keys (AESKey and IV/Nonce)
        public int[] keyLengths = {32, 16};
        // Passed to SecretKeySpec. Either AES or ChaCha20 please, thank you.
        public String family = "ChaCha20";
        // Passed to HKDF function
        public String hashAlgorithm = "sha256";
        // The actual cipher.
        public String cipher = "chacha20";

        // Don't provide this, we'll generate it. The addition data passed to the cipher (on AEAD ciphers)
        public String AAD = "";

        /**
         * Returns the correct cipher key lengths given the JS cipher name
         * @param cipher Cipher to grab the key lengths for
         * @param hashAlgorithm Hashing algorithm passed the the HKDF method
         */
        public CipherData(String cipher, String hashAlgorithm) throws NoSuchPaddingException, NoSuchAlgorithmException {
            // errr padding set to PKCS#5 since Node.JS does that by default: https://stackoverflow.com/questions/50701311/node-js-crypto-whats-the-default-padding-for-aes
            // https://developer.android.com/reference/javax/crypto/Cipher
            /*
                Android provides the following ciphers: AES_128
             */
            if (cipher.equalsIgnoreCase("chacha20-poly1305")) { // This is API 28+!
                this.keyLengths = this.chaCha20Poly1305;
                this.family = "ChaCha20";
                this.cipherTransformation = "ChaCha20/Poly1305/NoPadding";
            }
            else if (cipher.equalsIgnoreCase("chacha20")) {
                this.keyLengths = this.chaCha20;
                this.family = "ChaCha20";
                this.cipherTransformation = "ChaCha20/None/NoPadding";
            }
            else if (cipher.equalsIgnoreCase("aes-256-gcm")) {
                this.keyLengths = this.aes256; // might need 12 bit IV....
                this.family = "AES";
                this.cipherTransformation = "AES_256/GCM/NoPadding";
            }
            else if (cipher.equalsIgnoreCase("aes-256-cbc")) {
                this.keyLengths = this.aes256;
                this.family = "AES";
                this.cipherTransformation = "AES_256/CBC/NoPadding";
            }
            else if (cipher.equalsIgnoreCase("aes-128-gcm")) {
                this.keyLengths = this.aes128;
                this.family = "AES";
                this.cipherTransformation = "AES_128/GCM/NoPadding";
            }
            else if (cipher.equalsIgnoreCase("aes-128-cbc")) {
                this.keyLengths = this.aes128;
                this.family = "AES";
                this.cipherTransformation = "AES_128/CBC/NoPadding";
            }
            else if (cipher.equalsIgnoreCase("aes128")) {
                this.keyLengths = this.aes128;
                this.family = "AES";
                this.cipherTransformation = "AES_128/GCM/NoPadding";
            } else {
                throw new NoSuchAlgorithmException();
            }

            if (hashAlgorithm.equalsIgnoreCase("sha256"))
                this.hashAlgorithm = "sha256";
            else if (hashAlgorithm.equalsIgnoreCase("sha512"))
                this.hashAlgorithm = "sha512";
            else
                throw new NoSuchAlgorithmException(hashAlgorithm);

            Cipher.getInstance(this.cipherTransformation); // this will throw NoSuchPaddingException or NoSuchAlgorithmException
            this.cipher = cipher;
        }
    }

    public static class HKDFOptions {
        // Hashing algorithm used in deriving the key via HKDF
        public String hashAlgorithm = "sha256";
        // AES key length (this can just be your primary key)
        public int keyLength = 32;
        // IV length, needs to be 16 for any AES algorithm. If not needing a AES key, this can just be a secondary key (and ignored)
        public int ivLength = 16;
        // The IV generated is random. DO NOT SET THIS TO FALSE. Only set to false IF the IV must be shared and cannot be synced..(hint it's in the encrypted message!)
        public boolean uniqueIV = true;
        // Passed to SecretKeySpec. Either AES or ChaCha20 please, thank you.
        public String cipherFamily = "ChaCha20";

        public HKDFOptions() {}
        public HKDFOptions(boolean uniqueIV) {
            this.uniqueIV = uniqueIV;
        }
        public HKDFOptions(CipherData cipherData) {
            cipherFamily = cipherData.family;
            hashAlgorithm = cipherData.hashAlgorithm;
            keyLength = cipherData.keyLengths[0];
            ivLength = cipherData.keyLengths[1];
        }
        public HKDFOptions(CipherData cipherData, boolean uniqueIV) {
            this.uniqueIV = uniqueIV;
            cipherFamily = cipherData.family;
            hashAlgorithm = cipherData.hashAlgorithm;
            keyLength = cipherData.keyLengths[0];
            ivLength = cipherData.keyLengths[1];
        }
    }


    public static String randomString(int length, int minChar, int maxChar) {
        String str = "";
        if (maxChar > 220) // Honestly not sure why 220 is the limit, extended ASCII goes to 254
            maxChar = 127; // Upper limit of ASCII
        if (minChar < 32)
            minChar = 32; // Beginning of printable (NOT control characters)

        if (minChar>maxChar) {
            minChar = minChar + maxChar;
            maxChar = minChar - maxChar;
            minChar = minChar - maxChar;
        }

        for (int i = 0; i<length; i++)
            str += String.valueOf((char) (Math.floor(Math.random() * (maxChar - minChar) + minChar)));
        return str;
    }

    public static String randomString(int length, int minChar) {
        return randomString(length, minChar, 127);
    }
    public static String randomString(int length) {
        return randomString(length, 32, 127);
    }



    /**
     * Uses HKDF to derive a AES key and IV from a shared secret
     * @param sharedSecret your DH key
     * @param salt Little bit of salt (shared)
     * @return AES key
     */
    public static AESKey HKDF(@NonNull byte[] sharedSecret, byte[] salt, HKDFOptions options) {
        // could use separate DH exchange to generate a salt. . ?
        if (salt == null) {
            salt = new byte[0];
        }

        HKDF hkdf;
        if (options.hashAlgorithm.equalsIgnoreCase("sha256"))
            hkdf = HKDF.fromHmacSha256();
        else if (options.hashAlgorithm.equalsIgnoreCase("sha512"))
            hkdf = HKDF.fromHmacSha512();
        else
            hkdf = HKDF.fromHmacSha256(); // Take it or leave it.

        //extract the "raw" data to create output with concentrated entropy
        byte[] pseudoRandomKey = hkdf.extract(salt, sharedSecret);
        //create expanded bytes for e.g. AES secret key and IV
        byte[] expandedAesKey = hkdf.expand(pseudoRandomKey, null, options.keyLength);
        byte[] expandedIv;
        if (options.uniqueIV) {
            SecureRandom randomSecureRandom = new SecureRandom();
            expandedIv = new byte[options.ivLength];
            randomSecureRandom.nextBytes(expandedIv);
            //expandedIv = randomString(options.ivLength).getBytes(StandardCharsets.UTF_8); // Random IV/Nonce!!! This is okay, we pass the IV/Nonce with the encrypted text
        } else
            expandedIv = hkdf.expand(pseudoRandomKey, null, options.ivLength); // use this ONLY when the IV must be predictable and otherwise cannot be be shared.

        SecretKey key = new SecretKeySpec(expandedAesKey, options.cipherFamily);

        return new AESKey(key, expandedIv);
    }
    public static AESKey HKDF(SecretKey sharedSecret, String salt, HKDFOptions options) {
        return HKDF(sharedSecret.toString().getBytes(StandardCharsets.UTF_8), salt.getBytes(StandardCharsets.UTF_8), options);
    }

    public static AESKey HKDF(byte[] sharedSecret, CipherData cipherData) {
        return HKDF(sharedSecret, "mySalt1234".getBytes(StandardCharsets.UTF_8), new HKDFOptions(cipherData));
    }

    /**
     * Uses HKDF to derive a AES key and IV from a shared secret
     * @param sharedSecret your DH key
     * @return AES key
     */
    private AESKey HKDF(byte[] sharedSecret) {
        return HKDF(sharedSecret);
    }



    public static String encrypt(String plainText, SecretKey key, String salt, CipherData options) throws InvalidKeyException, InvalidAlgorithmParameterException {
        if (salt == null)
            salt = randomString(32);
        else if (salt.isEmpty())
            salt = randomString(32);

        if (key == null) throw new InvalidKeyException("SecretKey cannot be null.");

        boolean useAAD = false;
        String AAD = "";
        if (options.cipher == "aes-256-gcm" || options.cipher == "chacha20-poly1305" || options.cipher == "aes-192-gcm" || options.cipher == "aes-128-gcm") {
            useAAD = true;
            if (!options.AAD.isEmpty()) {
                AAD = options.AAD;
            } else
                AAD = randomString(16); // 128 bit AAD
        }

        HKDFOptions hkdfOptions =  new HKDFOptions(options);

        AESKey encryptionKey = HKDF(key, salt, hkdfOptions);
        try {
            Cipher cipher = Cipher.getInstance(options.cipherTransformation);
            if (options.family.equalsIgnoreCase("chacha20")) {
                //cipher.init(Cipher.ENCRYPT_MODE, encryptionKey.getKey(), new javax.crypto.spec.ChaCha20ParameterSpec(encryptionKey.getIv(), 1));
            } else if (!options.cipher.equalsIgnoreCase("aes-256-cbc") && !options.cipher.equalsIgnoreCase("aes-128-cbc")) {
                cipher.init(Cipher.ENCRYPT_MODE, encryptionKey.getKey(), new GCMParameterSpec(128, encryptionKey.getIv()));
            } else {
                // you really should not be using cbc mode..
                cipher.init(Cipher.ENCRYPT_MODE, encryptionKey.getKey(), new IvParameterSpec(encryptionKey.getIv()));
            }

            if (useAAD && !AAD.isEmpty())
                cipher.updateAAD(AAD.getBytes(StandardCharsets.UTF_8));

            // https://developer.android.com/reference/javax/crypto/Cipher#doFinal(byte[])
            byte[] cipherText = cipher.doFinal(plainText.getBytes(StandardCharsets.UTF_8));
            // So Java, for whatever reason, actually helps us out here by slapping the authentication tag on
            // but... for ncrypt we do not actually want that! so we need to chop it up ..:
            int tagSize = 128; // uhh, I pulled it from thin air
            byte[] authTag = new byte[0];
            byte[] encryptedData;
            if (useAAD) {
                authTag = Arrays.copyOfRange(cipherText, cipherText.length - (tagSize / Byte.SIZE), cipherText.length);
                encryptedData = Arrays.copyOfRange(cipherText, 0, cipherText.length - (tagSize / Byte.SIZE));
            } else
                encryptedData = cipherText;

            String output = encryptedPrefix;
            output += "1:";
            output += options.cipher + ":";				            // Cipher algorithm
            output += options.hashAlgorithm + ":";                  // HKDF hash algorithm
            output += convertStringToBase64(salt) + ":";            // Salt
            output += convertStringToBase64(NeptuneCrypto.randomString(16)) + ":"; // Garbage, means nothing
            output += convertBytesToHex(encryptionKey.getIv()) + ":";   // IV
            output += convertStringToBase64(new String(encryptedData, StandardCharsets.UTF_8)); // The data.
            if (useAAD) {
                output += ":" + convertStringToBase64(AAD) + ":";
                output += convertBytesToHex(authTag);
            }


            return output;
        } catch (InvalidKeyException e) { // Wrong key!
            throw new InvalidDecryptionKey();
        } catch (BadPaddingException | IllegalBlockSizeException | NoSuchPaddingException | NoSuchAlgorithmException e) {
            throw new UnsupportedCipher(options.cipher); // Bad cipher data. wait how'd you get here??? this shouldn't be possible
        }
    }

    public static String encrypt(String plainText, SecretKey key) throws NoSuchPaddingException, NoSuchAlgorithmException, InvalidAlgorithmParameterException, InvalidKeyException {
        NeptuneCrypto.CipherData cipherData = new NeptuneCrypto.CipherData("chacha20", "sha256");
        return encrypt(plainText, key, null, cipherData);
    }

    public static String decrypt(String encryptedText, SecretKey key) throws NoSuchPaddingException, NoSuchAlgorithmException {
        int AESKeyLength; // ?

        if (!isEncrypted(encryptedText))
            throw new DataNotEncrypted();

        String[] encryptedData = encryptedText.split("::")[1].split(":");

        // Version 1 has 9 segments for AEAD ciphers and 7 for non-AEAD ciphers
        String version = encryptedData[0];
        if (!version.equalsIgnoreCase("1"))
            throw new EncryptedDataInvalidVersion(encryptedData[0]);

        String cipherAlgorithm = encryptedData[1];
        // remember: java cannot compare strings via the == operator. That would be too easy. The == operator only compares memory addresses, not contents. Java wants to be special
        if (cipherAlgorithm.equalsIgnoreCase("aes-256-gcm") || cipherAlgorithm.equalsIgnoreCase("chacha20-poly1305") || cipherAlgorithm.equalsIgnoreCase("aes-192-gcm") || cipherAlgorithm.equalsIgnoreCase("aes-128-gcm")) {
            if (encryptedData.length != 9)
                throw new EncryptedDataSplitError(encryptedData.length, 9);
        } else {
            if (encryptedData.length != 7)
                throw new EncryptedDataSplitError(encryptedData.length, 7);
        }

        String hashAlgorithm = encryptedData[2];
        String salt = convertBase64ToString(encryptedData[3]);
        //String garbage = convertBase64ToString(encryptedData[4]);
        String iv = convertHexToString(encryptedData[5]);
        String data = convertBase64ToString(encryptedData[6]);

        String authTag;
        String AAD = "";
        if (encryptedData.length == 9) {
            AAD = convertBase64ToString(encryptedData[7]);
            authTag = convertHexToString(encryptedData[8]);
            data += authTag;
        }

        try {
            CipherData cipherData = new CipherData(cipherAlgorithm, hashAlgorithm);
            HKDFOptions hkdfOptions =  new HKDFOptions(cipherData);
            AESKey encryptionKey = HKDF(key, salt, hkdfOptions);

            Cipher cipher = Cipher.getInstance(cipherData.cipherTransformation);

            if (cipherData.family.equalsIgnoreCase("chacha20") || cipherData.family.equalsIgnoreCase("chacha20-poly1305")) {
                //cipher.init(Cipher.ENCRYPT_MODE, encryptionKey.getKey(), new javax.crypto.spec.ChaCha20ParameterSpec(iv.getBytes(StandardCharsets.UTF_8), 1));
            } else if (!cipherData.family.equalsIgnoreCase("aes-256-cbc") && !cipherData.family.equalsIgnoreCase("aes-128-cbc")) {
                cipher.init(Cipher.DECRYPT_MODE, encryptionKey.getKey(), new GCMParameterSpec(128, iv.getBytes(StandardCharsets.UTF_8)));
            } else {
                // you really should not be using cbc mode..
                cipher.init(Cipher.DECRYPT_MODE, encryptionKey.getKey(), new IvParameterSpec(iv.getBytes(StandardCharsets.UTF_8)));
            }

            boolean useAAD = false;
            if (cipherData.cipher == "aes-256-gcm" || cipherData.cipher == "chacha20-poly1305" || cipherData.cipher == "aes-192-gcm" || cipherData.cipher == "aes-128-gcm")
                useAAD = true;
            if (useAAD && !AAD.isEmpty())
                cipher.updateAAD(AAD.getBytes(StandardCharsets.UTF_8));

            byte[] decryptedText = cipher.doFinal(data.getBytes(StandardCharsets.UTF_8));
            return new String(decryptedText, StandardCharsets.UTF_8);
        } catch (InvalidAlgorithmParameterException | BadPaddingException | IllegalBlockSizeException e) {
            e.printStackTrace();
            throw new UnsupportedCipher(cipherAlgorithm);
        } catch (InvalidKeyException e) {
            throw new InvalidDecryptionKey();
        }
    }


    public static boolean isEncrypted(String plainText) {
        return plainText.substring(0,encryptedPrefix.length()).equalsIgnoreCase(encryptedPrefix);
    }


    public static String convertStringToBase64(@NonNull String string) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            return java.util.Base64.getEncoder().encodeToString(string.getBytes(StandardCharsets.UTF_8));
        }
        return Base64.encodeToString(string.getBytes(StandardCharsets.UTF_8), android.util.Base64.DEFAULT); // cannot be mocked in tests.
    }
    public static String convertBase64ToString(String b64) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            return new String(java.util.Base64.getDecoder().decode(b64),  StandardCharsets.UTF_8);
        }
        return new String(Base64.decode(b64, Base64.DEFAULT),  StandardCharsets.UTF_8);
    }
    public static String convertStringToHex(@NonNull String str){
        char[] chars = str.toCharArray();
        StringBuffer hex = new StringBuffer();
        for(int i = 0; i < chars.length; i++)
            hex.append(Integer.toHexString((int)chars[i]));
        return hex.toString();
    }
    public static String convertBytesToHex(byte[] bytes) {
        char[] HEX_ARRAY = "0123456789ABCDEF".toCharArray();
        char[] hexChars = new char[bytes.length * 2];
        for (int j = 0; j < bytes.length; j++) {
            int v = bytes[j] & 0xFF;
            hexChars[j * 2] = HEX_ARRAY[v >>> 4];
            hexChars[j * 2 + 1] = HEX_ARRAY[v & 0x0F];
        }
        return new String(hexChars);
    }

    public static String convertHexToString(@NonNull String hex){
        StringBuilder output = new StringBuilder();
        for (int i = 0; i < hex.length(); i+=2) {
            String str = hex.substring(i, i+2);
            output.append((char)Integer.parseInt(str, 16));
        }
        return output.toString();
    }



    private static class EncryptedDataSplitError extends Error {
        EncryptedDataSplitError(int actualParts, int requiredParts) {
            super("Encrypted data does not split properly (contains " + actualParts + " not " + requiredParts + " parts).");
        }
    }
    private static class DataNotEncrypted extends Error {
        DataNotEncrypted() {
            super("Data not encrypted, cannot find encrypted prefix " + encryptedPrefix);
        }
    }
    private static class EncryptedDataInvalidVersion extends Error {
        EncryptedDataInvalidVersion(String version) {
            super("Invalid encrypted data version, no idea how to handle version: " + version);
        }
    }
    private static class UnsupportedCipher extends Error {
        UnsupportedCipher(String requestedCipher) {
            super("Unsupported cipher: " + requestedCipher + ". Use chacha20, aes-256-gcm, or aes128.");
        }
    }
    private static class MissingDecryptionKey extends Error {
        MissingDecryptionKey() {
            super("Empty decryption key passed in with encrypted data.");
        }
    }
    private static class InvalidDecryptionKey extends Error {
        InvalidDecryptionKey() {
            super("Provided key was unable to decrypt the data, wrong key.");
        }
    }
}


