/**
 * Semantic versioning ( v1.5.2-release+Build2403 )
 * @class 
 */
class Version {
	/**
	 * Major version number ( vX.0.0 )
	 * @type {number}
	 */
	major = 0;

	/**
	 * Minor version number ( v0.X.0 )
	 * @type {number}
	 */
	minor = 0;

	/**
	 * Path number ( v0.0.X )
	 * @type {number}
	 */
	patch = 0;

	/**
	 * Pre-release label ( v0.0.0-X )
	 * @type {string}
	 */
	prerelease = "";

	/**
	 * Build metadata label ( v0.0.0-debug+X )
	 * @type {string}
	 */
	metaData = "";

	/**
	 * @constructor
	 * @param {(string|number)} major The major version (you can pass the whole version string to this parameter. By doing so we'll automatically parse it)
	 * @param {(number|string)} [minor = 0]
	 * @param {(number|string)} [patch = 0]
	 * @param {string} [label = ""] Pre-release label
	 * @param {string} [metaData = ""] Build meta data
	 */
	constructor(major, minor, patch, label, metaData) {
		if (typeof major === "string" && minor == undefined) {
			let ver = major.match(/^([0-9]|[1-9][0-9]*)\.([0-9]|[1-9][0-9]*)\.([0-9]|[1-9][0-9]*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/);
			if (ver == null)
				throw new Error(major + " is not a valid semantic version string.");

			this.major = ver[1];
			this.minor = ver[2];
			this.patch = ver[3];
			this.prerelease = ver[4];
			this.metaData = ver[5];
			return;
		}

		if (typeof major !== "number" && typeof major !== "string")
			throw new TypeError("major expected number|string not " + (typeof major).toString())
		if (typeof minor !== "number" && typeof minor !== "string")
			throw new TypeError("minor expected number|string not " + (typeof minor).toString())
		if (typeof patch !== "number" && typeof patch !== "string")
			throw new TypeError("patch expected number|string not " + (typeof patch).toString())

		if (label != undefined)
			if (typeof label !== "string")
				throw new TypeError("label expected string not " + (typeof label).toString())
		if (metaData != undefined)
			if (typeof metaData !== "string")
				throw new TypeError("metaData expected string not " + (typeof metaData).toString())

		this.major = parseInt(major);
		this.minor = parseInt(minor || 0);
		this.patch = parseInt(patch || 0);
		this.prerelease = label;
		this.metaData = metaData;
	}

	/**
	 * Convert the version to a readable string following the semantic styling
	 * @param {boolean} wrapInBracket Whether to wrap the prerelease and metadata information in brackets (v1.4.2{debug}[Metadata]) or the semantic way (v1.4.2-debug+Metadata)
	 * @returns 
	 */
	toString(wrapInBracket) {
		let str = `${this.major}.${this.minor}.${this.patch}`;

		if (this.prerelease != "" && this.prerelease != undefined)
			if (wrapInBracket)
				str += "{" + this.prerelease + "}"
			else
				str += "-" + this.prerelease

		if (this.metaData != "" && this.metaData != undefined)
			if (wrapInBracket)
				str += "[" + this.metaData + "]"
			else
				str += "+" + this.metaData

		return str
	}

}


module.exports = Version;