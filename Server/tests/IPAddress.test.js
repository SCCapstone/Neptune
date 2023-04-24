const crypto = require("crypto");
const fs = require("node:fs");

const IPAddress = require("../src/Classes/IPAddress");




describe("IP Tests", () => {
    describe('constructor', () => {
        test('should create a new instance if the ip and port are valid', () => {
            const ipAddress = new IPAddress('192.168.0.1', 8080);
            expect(ipAddress).toBeDefined();
            expect(ipAddress.getIPAddress()).toBe('192.168.0.1');
            expect(ipAddress.getPort()).toBe(8080);
        });

        test('should ignore if the port is missing', () => {
            const ipAddress = new IPAddress('192.168.0.1');
            expect(ipAddress).toBeDefined();
            expect(ipAddress.getIPAddress()).toBe('192.168.0.1');
            expect(ipAddress.getPort()).toBeUndefined();
        });

        test('should create a new instance if the ip and port are one string', () => {
            const ipAddress = new IPAddress('192.168.0.56:8124');
            expect(ipAddress).toBeDefined();
            expect(ipAddress.getIPAddress()).toBe('192.168.0.56');
            expect(ipAddress.getPort()).toBe(8124);
        });

        test('should create a new instance if the ip and port are one string, ignoring non-number port', () => {
            const ipAddress = new IPAddress('192.168.0.56:8A124');
            expect(ipAddress).toBeDefined();
            expect(ipAddress.getIPAddress()).toBe('192.168.0.56');
            expect(ipAddress.getPort()).toBeUndefined();
        });


        test('should throw an error if the ip address is invalid', () => {
            expect(() => new IPAddress('not_an_ip_address', 8080)).toThrow(Error);
        });

        test('should throw an error if the port is invalid', () => {
            expect(() => new IPAddress('192.168.0.1', 'not_a_port')).toThrow(Error);
        });


        test('should throw an error if both ip address and port are invalid', () => {
            expect(() => new IPAddress('not_an_ip_address', 'not_a_port')).toThrow(Error);
        });
    });


    describe('isValidIPAddress', () => {
        test('should return true for valid IP addresses', () => {
            expect(new IPAddress().isValidIPAddress('192.168.0.1')).toBe(true);
            expect(new IPAddress().isValidIPAddress('127.0.0.1')).toBe(true);
        });

        test('should return false for invalid IP addresses', () => {
            expect(new IPAddress().isValidIPAddress('not_an_ip_address')).toBe(false);
            expect(new IPAddress().isValidIPAddress('192.168.0.256')).toBe(false);
            expect(new IPAddress().isValidIPAddress('')).toBe(false);
        });
    });

    describe('isValidPort', () => {
        test('should return true for valid port numbers', () => {
            expect(new IPAddress().isValidPort(8080)).toBe(true);
            expect(new IPAddress().isValidPort("25560")).toBe(true);
            expect(new IPAddress().isValidPort(12345)).toBe(true);
            expect(new IPAddress().isValidPort("22335")).toBe(true);
        });

        test('should return false for invalid port numbers', () => {
            expect(new IPAddress().isValidPort(-1)).toBe(false);
            expect(new IPAddress().isValidPort(0)).toBe(false);
            expect(new IPAddress().isValidPort(1000)).toBe(false);
            expect(new IPAddress().isValidPort(70000)).toBe(false);
            expect(new IPAddress().isValidPort({})).toBe(false);
        });
    });


    describe('setIPAddress', () => {
        test('should set the IPAddress for valid IP addresses', () => {
            const ipAddress = new IPAddress();
            ipAddress.setIPAddress('192.168.0.1');
            expect(ipAddress.getIPAddress()).toBe('192.168.0.1');
        });

        test('should throw an error for invalid IP addresses', () => {
            const ipAddress = new IPAddress();
            expect(() => ipAddress.setIPAddress('not_an_ip_address')).toThrow(Error);
            expect(ipAddress.getIPAddress()).toBeUndefined();
        });
    });

    describe('setPort', () => {
        test('should set the port for valid port numbers', () => {
            const ipAddress = new IPAddress('192.168.0.1');
            ipAddress.setPort(8080);
            expect(ipAddress.getPort()).toBe(8080);
        });

        test('should throw an error for invalid port numbers', () => {
            const ipAddress = new IPAddress('192.168.0.1', 8080);
            expect(() => ipAddress.setPort(-1)).toThrow(Error);
            expect(ipAddress.getPort()).toBe(8080);
            expect(() => ipAddress.setPort(0)).toThrow(Error);
            expect(ipAddress.getPort()).toBe(8080);
            expect(() => ipAddress.setPort(1000)).toThrow(Error);
            expect(ipAddress.getPort()).toBe(8080);
            expect(() => ipAddress.setPort("70000")).toThrow(Error);
            expect(ipAddress.getPort()).toBe(8080);
        });

    });

    describe('toString', () => {
        test('should return a string representation of the IPAddress object', () => {
            const ipAddress = new IPAddress('192.168.0.1', 8080);
            expect(ipAddress.toString()).toBe('192.168.0.1:8080');
        });
    });
});