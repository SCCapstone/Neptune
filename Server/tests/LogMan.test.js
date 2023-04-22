const { LogMan, Logger } = require("../src/Classes/LogMan");

const mockLogManLogFunction = jest.fn();

const assert = require('assert');
const fs = require('fs');

const logName = 'test-log';
const logFolder = './tests/logs';
const logPath = `${logFolder}/${logName}.log`;
describe('LogMan', () => {

  afterEach(() => {
    if (fs.existsSync(logPath)) {
      fs.unlinkSync(logPath);
    }
  });

  afterAll((done) => {
    setTimeout(() => {
      if (fs.existsSync(logPath)) {
        fs.unlinkSync(logPath);
      }

      done();
    }, 500);
  });

  describe('constructor', () => {
    it('should throw a TypeError when logName is not a string', () => {
      assert.throws(() => new LogMan(null), TypeError);
    });

    it('should create a log file in the specified directory', () => {
      const logger = new LogMan(logName, logFolder);
      setTimeout(() => {
        assert.ok(fs.existsSync(logPath));
      }, 500);
    });

    it('should create the log folder if it does not exist', () => {
      const logger = new LogMan(logName, logFolder);
      setTimeout(() => {
        assert.ok(fs.existsSync(logFolder));
      }, 500);
    });

    it('should overwrite the log file if cleanLog option is true', () => {
      fs.writeFileSync(logPath, 'test');
      const logger = new LogMan(logName, logFolder, { cleanLog: true });
      setTimeout(() => {
        expect(fs.readFileSync(logPath, 'utf8')).not.toBe('test')
      }, 500);
    });
  });

  describe('log', () => {
    it('should throw an error if log file is closed', () => {
      const logMan = new LogMan(logName, logFolder);
      logMan.close();
      assert.throws(() => logger.log('test', 'info', 'test message'), Error);
    });

    it("should not write to console or log file when outputToConsole and outputToFile options are false", () => {
      const consoleSpy = jest.spyOn(console, 'log');
      const mockFileStream = {
        write: jest.fn(),
        end: jest.fn(),
      };
      const createWriteStreamSpy = jest.spyOn(fs, 'createWriteStream').mockReturnValueOnce(mockFileStream);

      const logMan = new LogMan(logName, logFolder, { outputToConsole: false, outputToFile: false });
      const logger = logMan.getLogger("logger")
      logger.info("Test message");

      expect(consoleSpy).not.toHaveBeenCalled();
      expect(createWriteStreamSpy).toHaveBeenCalledTimes(1);
      expect(createWriteStreamSpy).toHaveBeenCalledWith(logPath, { flags: 'a' });
      expect(mockFileStream.write).not.toHaveBeenCalled();
      expect(mockFileStream.end).not.toHaveBeenCalled();
      jest.restoreAllMocks();
    });

    it('should write to console and file when outputToConsole and outputToFile options are true', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      const mockFileStream = {
        write: jest.fn(),
        end: jest.fn(),
      };
      const createWriteStreamSpy = jest.spyOn(fs, 'createWriteStream').mockReturnValueOnce(mockFileStream);

      const logMan = new LogMan(logName, logFolder, { outputToConsole: true, outputToFile: true, consoleSufix: "", filePrefix: "[%logName%]" });
      const logger = logMan.getLogger("logger");
      logger.info('test message');
      expect(consoleSpy).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledWith('[logger][Info] test message');

      expect(createWriteStreamSpy).toHaveBeenCalledTimes(1);
      expect(createWriteStreamSpy).toHaveBeenCalledWith(logPath, { flags: 'a' });

      expect(mockFileStream.write).toHaveBeenCalledTimes(1);
      expect(mockFileStream.write).toHaveBeenCalledWith('[' + logName + '][Info][logger] test message' + ((process.platform === "win32")? "\r\n" : "\n"));

      logMan.close();
      expect(mockFileStream.end).toHaveBeenCalledTimes(1);
      
      jest.restoreAllMocks();
    });

  });
});



describe('Logger', () => {
  afterEach(() => {
    mockLogManLogFunction.mockReset();
  });

  afterAll((done) => {
    setTimeout(() => {
      if (fs.existsSync(`${logFolder}/${logName}2.log`)) {
        fs.unlinkSync(`${logFolder}/${logName}2.log`);
      }

      done();
    }, 500);
  });

  it('should throw an error if logManLogFunction is not a function', () => {
    expect(() => new Logger('not a function', 'myLogger')).toThrow();
  });

  it('should throw an error if logName is not a string', () => {
    expect(() => new Logger(mockLogManLogFunction, 42)).toThrow();
  });

  it('should call logManLogFunction with the correct arguments when logging critical messages', () => {
    const logger = new Logger(mockLogManLogFunction, 'myLogger');
    logger.critical('critical message');
    expect(mockLogManLogFunction).toHaveBeenCalledWith('myLogger', 'Critical', 'critical message', true);
  });

  it('should call logManLogFunction with the correct arguments when logging error messages', () => {
    const logger = new Logger(mockLogManLogFunction, 'myLogger');
    logger.error('error message');
    expect(mockLogManLogFunction).toHaveBeenCalledWith('myLogger', 'Error', 'error message', true);
  });

  it('should call logManLogFunction with the correct arguments when logging warn messages', () => {
    const logger = new Logger(mockLogManLogFunction, 'myLogger');
    logger.warn('warn message');
    expect(mockLogManLogFunction).toHaveBeenCalledWith('myLogger', 'Warn', 'warn message', true);
  });

  it('should call logManLogFunction with the correct arguments when logging info messages', () => {
    const logger = new Logger(mockLogManLogFunction, 'myLogger');
    logger.info('info message');
    expect(mockLogManLogFunction).toHaveBeenCalledWith('myLogger', 'Info', 'info message', true);
  });

  it('should call logManLogFunction with the correct arguments when logging http messages', () => {
    const logger = new Logger(mockLogManLogFunction, 'myLogger');
    logger.http('http message');
    expect(mockLogManLogFunction).toHaveBeenCalledWith('myLogger', 'HTTP', 'http message', true);
  });

  it('should call logManLogFunction with the correct arguments when logging verbose messages', () => {
    const logger = new Logger(mockLogManLogFunction, 'myLogger');
    logger.verbose('verbose message');
    expect(mockLogManLogFunction).toHaveBeenCalledWith('myLogger', 'Verbose', 'verbose message', true);
  });

  it('should call logManLogFunction with the correct arguments when logging debug messages', () => {
    const logger = new Logger(mockLogManLogFunction, 'myLogger');
    logger.debug('debug message');
    expect(mockLogManLogFunction).toHaveBeenCalledWith('myLogger', 'Debug', 'debug message', true);
  });

  it('should call logManLogFunction with the correct arguments when logging silly messages', () => {
    const logger = new Logger(mockLogManLogFunction, 'myLogger');
    logger.silly('silly message');
    expect(mockLogManLogFunction).toHaveBeenCalledWith('myLogger', 'Silly', 'silly message', true);
  });


  it('should output the message to the console when outputToConsole is true', () => {
    const logMan = new LogMan(logName + "2", logFolder);
    const logger = logMan.getLogger('myLogger');
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    logger.info('info message', true);
    expect(consoleSpy).toHaveBeenCalledWith('[myLogger][Info] info message\x1b[0m');
    consoleSpy.mockRestore();
  });
  it('should not output the message to the console when outputToConsole is false', () => {
    const logMan = new LogMan(logName + "2", logFolder);
    const logger = logMan.getLogger('myLogger');
    const consoleSpy = jest.spyOn(console, 'log');
    logger.info('info message', false);
    expect(consoleSpy).not.toHaveBeenCalled();
  });



  describe("#constructor()", function() {
    it("should throw TypeError if logManLogFunction is not a function", function() {
      expect(function() {
        new Logger(null, "test");
      }).toThrow(TypeError);
    });

    it("should throw TypeError if logName is not a string", function() {
      expect(function() {
        new Logger(function() {}, null);
      }).toThrow(TypeError);
    });
  });

  describe("#critical()", () => {
    it("should call logManLogFunction with correct arguments", () => {
      const logManLogFunction = jest.fn();
      const logger = new Logger(logManLogFunction, "test");
      logger.critical("test message");
      expect(logManLogFunction).toHaveBeenCalledWith("test", "Critical", "test message", true);
    });
  });

  describe("#error()", () => {
    it("should call logManLogFunction with correct arguments", () => {
      const logManLogFunction = jest.fn();
      const logger = new Logger(logManLogFunction, "test");
      logger.error("test message");
      expect(logManLogFunction).toHaveBeenCalledWith("test", "Error", "test message", true);
    });
  });

  describe("#warn()", () => {
    it("should call logManLogFunction with correct arguments", () => {
      const logManLogFunction = jest.fn();
      const logger = new Logger(logManLogFunction, "test");
      logger.warn("test message");
      expect(logManLogFunction).toHaveBeenCalledWith("test", "Warn", "test message", true);
    });
  });

  describe("#info()", () => {
    it("should call logManLogFunction with correct arguments", () => {
      const logManLogFunction = jest.fn();
      const logger = new Logger(logManLogFunction, "test");
      logger.info("test message");
      expect(logManLogFunction).toHaveBeenCalledWith("test", "Info", "test message", true);
    });
  });

  describe("#http()", () => {
    it("should call logManLogFunction with correct arguments", () => {
      const logManLogFunction = jest.fn();
      const logger = new Logger(logManLogFunction, "test");
      logger.http("test message");
      expect(logManLogFunction).toHaveBeenCalledWith("test", "HTTP", "test message", true);
    });
  });

  describe("#verbose()", () => {
    it("should call logManLogFunction with correct arguments", () => {
      const logManLogFunction = jest.fn();
      const logger = new Logger(logManLogFunction, "test");
      logger.verbose("test message");
      expect(logManLogFunction).toHaveBeenCalledWith("test", "Verbose", "test message", true);
    });
  });

  describe("#debug()", () => {
    it("should call logManLogFunction with correct arguments", () => {
      const logManLogFunction = jest.fn();
      const logger = new Logger(logManLogFunction, "test");
      logger.debug("test message");
      expect(logManLogFunction).toHaveBeenCalledWith("test", "Debug", "test message", true);
    });
  });

  describe("#silly()", function() {
    it("should call logManLogFunction with correct arguments", function() {
      const logManLogFunction = jest.fn();
      const logger = new Logger(logManLogFunction, "test");
      logger.silly("test message");
      expect(logManLogFunction).toHaveBeenCalledTimes(1);
      expect(logManLogFunction).toHaveBeenCalledWith("test", "Silly", "test message", true);
    });
  });
});