/**
 *      _  _ 
 *     | \| |
 *     | .` |
 *     |_|\_|eptune
 *
 *     Capstone Project 2022
 * 
 *     Resource Manager
 */

const { QIcon } = require('@nodegui/nodegui');
const path = require('node:path');

/**
 * Resource manager provides a universal tool used to lookup and grab resource files (images)
 */
class ResourceManager {
	/**
	 * @type {QIcon} Main application icon. Used in windows and tray icon.
	 */
	ApplicationIcon = new QIcon(path.resolve(__dirname, "../Resources/coconut.jpg"));

    constructor() {}

    resolveResourcePath(filepath) {
        return path.resolve(__dirname, "../src/Resources/" + filepath);
    }
}


module.exports = ResourceManager;