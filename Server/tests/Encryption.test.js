const { randomUUID } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const Client = require("../src/Classes/Client");
const configFile = path.join(__dirname, "data", "NeptuneTestConfig.json")


global.Neptune.setupConfigurations();


var tempClient;
const tempClientUUID = randomUUID();
const clientConfigFile = path.join(__dirname, "data", "clients", "client_" + tempClientUUID + ".json")

describe('Encryption', () => {
    beforeAll(() => {
        global.Neptune.setupConfigurations();
        tempClient = new Client(global.Neptune.configurationManager, tempClientUUID);
    });

    afterAll(() => {
        try {
            tempClient.delete();
        } catch {
            if (fs.existsSync(clientConfigFile))
                fs.rmSync(clientConfigFile);
        }
        global.Neptune.tearDownConfigurations();
    });

    test('should enable encryption when passing true', async () => {
        // Enable encryption
        const result = await global.Neptune.configurationManager.rekey(true);
        expect(result).toBe(true);

        // Verify that encryption is enabled
        const fileContents = fs.readFileSync(configFile, 'utf8');
        expect(fileContents.startsWith('ncrypt::')).toBe(true);

        // For our client
        const clientFileContents = fs.readFileSync(clientConfigFile, 'utf8');
        expect(clientFileContents.startsWith('ncrypt::')).toBe(true);
    });

    test('should disable encryption when passing false', async () => {
        // Disable encryption
        const result = await global.Neptune.configurationManager.rekey(false);
        expect(result).toBe(true);

        // Verify that encryption is disabled
        const fileContents = fs.readFileSync(configFile, 'utf8');
        expect(fileContents.startsWith('ncrypt::')).toBe(false);

        // For our client
        const clientFileContents = fs.readFileSync(clientConfigFile, 'utf8');
        expect(clientFileContents.startsWith('ncrypt::')).toBe(false);
    });

    test('should rekey (change the encryption key) when passing true', async () => {
        // Enable encryption with a new key
        const result1 = await global.Neptune.configurationManager.rekey(true);
        expect(result1).toBe(true);

        const fileContents1 = fs.readFileSync(configFile, 'utf8');
        const clientContents1 = fs.readFileSync(clientConfigFile, 'utf8');

        // Rekey (change the encryption key)
        const result2 = await global.Neptune.configurationManager.rekey(true);
        expect(result2).toBe(true);

        const fileContents2 = fs.readFileSync(configFile, 'utf8'); // Read the file contents after rekeying
        const clientContents2 = fs.readFileSync(clientConfigFile, 'utf8');
        expect(fileContents1).not.toBe(fileContents2); // Verify that the file contents have changed
        expect(clientContents1).not.toBe(clientContents2); // Verify that the file contents have changed
    });
});


global.Neptune.tearDownConfigurations();