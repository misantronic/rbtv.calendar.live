var Promise    = require('promise');
var moment     = require('moment');
var fs         = require('fs');
var readline   = require('readline');
var google     = require('googleapis');
var googleAuth = require('google-auth-library');

// If modifying these scopes, delete your previously saved credentials
// at ~/.credentials/calendar-nodejs-quickstart.json
var SCOPES     = ['https://www.googleapis.com/auth/calendar'];
var TOKEN_DIR  = (process.env.HOME || process.env.HOMEPATH ||
	process.env.USERPROFILE) + '/.credentials/';
var TOKEN_PATH = TOKEN_DIR + 'calendar-nodejs-quickstart.json';

var auth, calendarData;
var calendar   = google.calendar('v3');
var calendarId = '5aj6musne0k96vbqlu43p8lgs0@group.calendar.google.com';

function start(data) {
	calendarData = data;

	// Load client secrets from a local file.
	fs.readFile('./credentials/client_secret.json', function processClientSecrets(err, content) {
		if (err) {
			console.log('Error loading client secret file: ' + err);
			return;
		}
		// Authorize a client with the loaded credentials, then call the
		// Google Calendar API.
		authorize(JSON.parse(content), onAuthorized);
	});
}

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 *
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
	var clientSecret = credentials.installed.client_secret;
	var clientId     = credentials.installed.client_id;
	var redirectUrl  = credentials.installed.redirect_uris[0];
	var auth         = new googleAuth();
	var oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);

	// Check if we have previously stored a token.
	fs.readFile(TOKEN_PATH, function (err, token) {
		if (err) {
			getNewToken(oauth2Client, callback);
		} else {
			oauth2Client.credentials = JSON.parse(token);
			callback(oauth2Client);
		}
	});
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 *
 * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback to call with the authorized
 *     client.
 */
function getNewToken(oauth2Client, callback) {
	var authUrl = oauth2Client.generateAuthUrl({
		access_type: 'offline',
		scope: SCOPES
	});
	console.log('Authorize this app by visiting this url: ', authUrl);
	var rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout
	});
	rl.question('Enter the code from that page here: ', function (code) {
		rl.close();
		oauth2Client.getToken(code, function (err, token) {
			if (err) {
				console.log('Error while trying to retrieve access token', err);
				return;
			}
			oauth2Client.credentials = token;
			storeToken(token);
			callback(oauth2Client);
		});
	});
}

/**
 * Store token to disk be used in later program executions.
 *
 * @param {Object} token The token to store to disk.
 */
function storeToken(token) {
	try {
		fs.mkdirSync(TOKEN_DIR);
	} catch (err) {
		if (err.code != 'EEXIST') {
			throw err;
		}
	}
	fs.writeFile(TOKEN_PATH, JSON.stringify(token));
	console.log('Token stored to ' + TOKEN_PATH);
}

/**
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function onAuthorized(OAuth2) {
	auth = OAuth2;

	removeEvents()
		.then(function () {
			prepareEvents()
		});
}

function prepareEvents() {
	console.log("\n"+ 'Google Calendar API: prepareEvents', JSON.stringify(calendarData) +"\n");

	// Map calendar data
	var events = calendarData.map(function (show) {
		var startTime   = show.startTime.format();
		var endTime     = show.endTime.format();
		var description = show.description;
		var summary     = show.title + (description ? ' - ' + description : '');

		switch(show.type) {
			case 'live':
				summary = '[L] '+ summary;
				break;
			case 'premiere':
				summary = '[N] '+ summary;
				break;
		}

		return {
			auth: auth,
			calendarId: calendarId,
			resource: {
				start: {
					dateTime: startTime
				},
				end: {
					dateTime: endTime
				},
				description: description,
				summary: summary
			}
		};
	});

	addEvents(events, 0);
}

function addEvents(events, i) {
	if(events[i]) {
		addEvent(events[i]).done(function () {
			addEvents(events, i+1);
		})
	} else {
		console.log('Finished.');
	}
}

function addEvent(obj) {
	return new Promise(function (resolve, reject) {
		calendar.events.insert(obj, function (err, response) {
			if (err) {
				console.log('The API returned an error: ' + err);

				reject();
				return;
			}

			if (response.status === 'confirmed') {
				console.log('- Event added: ', response.summary);

				resolve();
				return;
			}

			reject();
		});
	});
}

function removeEvents() {
	console.log('Google Calendar API: removeEvents');

	return new Promise(function (resolve, reject) {
		calendar.events.list({
			auth: auth,
			calendarId: calendarId
		}, function (err, response) {
			if (err) {
				console.log('The API returned an error: ' + err);
				reject();
				return;
			}

			var items       = response.items;
			var deleteCount = 0;

			console.log('- Removing items:', items.length);

			if (items.length === 0) {
				resolve();
			} else {
				items.forEach(function (event) {
					calendar.events.delete({
						auth: auth,
						calendarId: calendarId,
						eventId: event.id
					}, function (err, response) {
						if (!response) {
							deleteCount++;

							if (deleteCount === items.length) {
								resolve();
							}
						}
					});
				});
			}
		});
	});
}

module.exports = {
	start: start
};