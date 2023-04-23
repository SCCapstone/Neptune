package com.neptune.app.Backend;

import static org.junit.Assert.*;

import org.junit.Test;

public class IPAddressTest {

    @Test
    public void testValidIPAddressAndPort() {
        IPAddress ipAddress = new IPAddress("192.168.0.1", 8080);
        //Server server = new Server(ipAddress);
        assertNotNull(ipAddress);
        assertEquals("192.168.0.1", ipAddress.getIPAddress().toString());
        assertEquals(8080, ipAddress.getPort());
    }

    @Test
    public void testIPAddressAndPortInOneString() {
        IPAddress ipAddress = new IPAddress("192.168.0.56:8124");
        assertNotNull(ipAddress);
        assertEquals("192.168.0.56", ipAddress.getIPAddress());
        assertEquals(8124, ipAddress.getPort());
    }

    @Test
    public void testInvalidIPAddress() {
        assertThrows(Error.class, () -> new IPAddress("not_an_ip_address", 8080));
    }

    @Test
    public void testInvalidPort() {
        assertThrows(Error.class, () -> new IPAddress("192.168.0.1 :not_a_port"));
    }

    @Test
    public void testInvalidIPAddressAndPort() {
        assertThrows(Error.class, () -> new IPAddress("not_an_ip_address :not_a_port"));
    }


    @Test
    public void isValidIPAddress() {
        // should return true for valid IP addresses
        IPAddress ipAddress = new IPAddress("192.168.0.1", 8080);
        assertTrue(ipAddress.isValidIPAddress("192.168.0.1"));
        assertTrue(ipAddress.isValidIPAddress("127.0.0.1"));

        // should return false for invalid IP addresses
        assertFalse(ipAddress.isValidIPAddress("not_an_ip_address"));
        assertFalse(ipAddress.isValidIPAddress("192.168.0.256"));
        assertFalse(ipAddress.isValidIPAddress(""));
    }

    @Test
    public void isValidPort() {
        IPAddress ipAddress = new IPAddress("192.168.0.1", 8080);
        assertTrue(ipAddress.isValidPort(8080));
        assertTrue(ipAddress.isValidPort(25560));
        assertTrue(ipAddress.isValidPort(12345));
        assertTrue(ipAddress.isValidPort(22335));
    }


    @Test
    public void setPort() {
        IPAddress ipAddress = new IPAddress("192.168.0.1", 8080);
        ipAddress.setPort(8080);
        assertEquals(8080, ipAddress.getPort());
    }

    @Test
    public void setIPAddressTest() {
        IPAddress ipAddress = new IPAddress("192.168.0.1", 8080);
        ipAddress.setIPAddress("192.168.0.1");
        assertEquals("192.168.0.1", ipAddress.getIPAddress());

    }
}