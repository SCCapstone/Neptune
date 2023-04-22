const Version = require("../src/Classes/Version");

describe('Version', () => {
  describe('constructor', () => {
    it('should create a new Version object with default values', () => {
      const version = new Version();
      expect(version.major).toBe(0);
      expect(version.minor).toBe(0);
      expect(version.patch).toBe(0);
      expect(version.prerelease).toBe('');
      expect(version.metaData).toBe('');
    });

    it('should create a new Version object with valid data', () => {
      const version = new Version(1, 2, 3, 'alpha', 'debug');
      expect(version.major).toBe(1);
      expect(version.minor).toBe(2);
      expect(version.patch).toBe(3);
      expect(version.prerelease).toBe('alpha');
      expect(version.metaData).toBe('debug');
    });

    it('should parse a semantic version string into a new Version object', () => {
      const version = new Version('1.2.3-alpha+debug');
      expect(version.major).toBe(1);
      expect(version.minor).toBe(2);
      expect(version.patch).toBe(3);
      expect(version.prerelease).toBe('alpha');
      expect(version.metaData).toBe('debug');
    });

    it('should throw an error with invalid data', () => {
      expect(() => new Version('1.2.3-alpha+debug+extra')).toThrow();
      expect(() => new Version(1, 2, 'invalid')).toThrow();
      expect(() => new Version(1, 2, [3])).toThrow();
      expect(() => new Version(true, 2, 3)).toThrow();
      expect(() => new Version(1, { minor: 2 }, 3)).toThrow();
      expect(() => new Version(1, 2, 3, 4)).toThrow();
      expect(() => new Version(1, 2, 3, {}, 'debug')).toThrow();
      expect(() => new Version(1, 2, 3, "valid", {})).toThrow();
    });
  });

  describe('toString', () => {
    it('should convert the Version object to a string', () => {
      const version = new Version(1, 2, 3, 'alpha', 'debug');
      expect(version.toString()).toBe('1.2.3-alpha+debug');
    });

    it('should wrap the prerelease and metadata in brackets if specified', () => {
      const version = new Version(1, 2, 3, 'alpha', 'debug');
      expect(version.toString(true)).toBe('1.2.3{alpha}[debug]');
    });
  });
});