var fs           = require('fs');
var readline     = require('readline');
var googleAuth   = require('google-auth-library');
var clientSecret = './credentials/client_secret.json';
// If modifying these scopes, delete your previously saved credentials
// at ~/.credentials/calendar-nodejs-quickstart.json
var SCOPES     = ['https://www.googleapis.com/auth/calendar'];
var TOKEN_DIR  = (process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE) + '/.credentials/';
var TOKEN_PATH = TOKEN_DIR + 'calendar-nodejs-quickstart.json';

function GoogleAuth() {

}

GoogleAuth.prototype.start = function (callback) {
	// Load client secrets from a local file.
	fs.readFile(clientSecret, function (err, content) {
		var credentials;

		if (err) {
			// Get credentials from env vars
			credentials = {
				installed: {
					client_secret: process.env.client_secret,
					client_id: process.env.client_id,
					redirect_uris: [
						process.env.redirect_uri
					]
				}
			}
		} else {
			credentials = JSON.parse(content);
		}

		// Authorize a client with the loaded credentials, then call the
		// Google Calendar API.
		this._authorize(credentials, callback);
	}.bind(this));
};

/**
 *
 * @param credentials
 * @param callback
 * @private
 */
GoogleAuth.prototype._authorize = function (credentials, callback) {
	var clientSecret = credentials.installed.client_secret;
	var clientId     = credentials.installed.client_id;
	var redirectUrl  = credentials.installed.redirect_uris[0];
	var auth         = new googleAuth();

	this.oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);

	// Check if we have previously stored a token.
	fs.readFile(TOKEN_PATH, function (err, token) {
		if (err) {
			this._getNewToken(callback);
		} else {
			this.oauth2Client.credentials = JSON.parse(token);
			callback(this.oauth2Client);
		}
	}.bind(this));
};

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 *
 * @param {Function} callback The callback to call with the authorized
 *     client.
 * @private
 */
GoogleAuth.prototype._getNewToken = function (callback) {
	var authUrl = this.oauth2Client.generateAuthUrl({
		access_type: 'offline',
		scope: SCOPES
	});

	console.log('Authorize this app by visiting this url: ', authUrl);

	var rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout
	});

	if(process.env.client_code) {
		this._applyCode(process.env.client_code, callback);
	} else {
		rl.question('Enter the code from that page here: ', function (code) {
			rl.close();
			this._applyCode(code, callback);
		}.bind(this));
	}
};

GoogleAuth.prototype._applyCode = function (code, callback) {
	this.oauth2Client.getToken(code, function (err, token) {
		if (err) {
			console.log('Error while trying to retrieve access token', err);
			return;
		}

		this.oauth2Client.credentials = token;

		this._storeToken(token);

		callback(this.oauth2Client);
	}.bind(this));
};

/**
 * Store token to disk be used in later program executions.
 *
 * @param {Object} token The token to store to disk.
 * @private
 */
GoogleAuth.prototype._storeToken = function (token) {
	try {
		fs.mkdirSync(TOKEN_DIR);
	} catch (err) {
		if (err.code != 'EEXIST') {
			throw err;
		}
	}
	fs.writeFile(TOKEN_PATH, JSON.stringify(token));
	console.log('Token stored to ' + TOKEN_PATH);
};

module.exports = GoogleAuth;