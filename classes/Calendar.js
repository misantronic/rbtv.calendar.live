var google = require('googleapis');
var Promise = require('promise');
var readline = require('readline');

var calendar = google.calendar('v3');

function Calendar(calendarId, auth) {
    this.calendarId = calendarId;
    this.auth = auth;
}

Calendar.prototype.removeAllEvents = function() {
    console.log('Google Calendar API: removeAllEvents');

    this.rl = readline.createInterface(process.stdin, process.stdout);

    return new Promise(
        function(resolve, reject) {
            calendar.events.list(
                {
                    auth: this.auth,
                    singleEvents: true,
                    calendarId: this.calendarId
                },
                function(err, response) {
                    if (err) {
                        console.error('The API returned an error: ' + err);
                        reject();
                        return;
                    }

                    var items = response.items;

                    console.log('- Removing items:', items.length);

                    if (items.length === 0) {
                        resolve();
                    } else {
                        var events = items.map(
                            function(event) {
                                return {
                                    auth: this.auth,
                                    calendarId: this.calendarId,
                                    eventId: event.id
                                };
                            }.bind(this)
                        );

                        this._deleteCounter = 0;
                        this._eventsTodelete = events.length;

                        this._removeEvents(events, 0, resolve);
                    }
                }.bind(this)
            );
        }.bind(this)
    );
};

Calendar.prototype.insertEvents = function(data) {
    console.log('\n' + 'Google Calendar API: insertEvents', JSON.stringify(data) + '\n');

    // Map calendar data
    var events = data.map(
        function(show) {
            var startTime = show.startTime.format();
            var endTime = show.endTime.format();
            var description = show.description;
            var summary = show.title + (description ? ' - ' + description : '');
            var image = show.image;
            var colorId = 9;

            switch (show.type) {
                case 'live':
                    summary = '[L] ' + summary;
                    colorId = 11;
                    break;
                case 'premiere':
                    summary = '[N] ' + summary;
                    colorId = 9;
                    break;
            }

            return {
                auth: this.auth,
                calendarId: this.calendarId,
                supportsAttachments: true,
                resource: {
                    start: {
                        dateTime: startTime
                    },
                    end: {
                        dateTime: endTime
                    },
                    description: description,
                    summary: summary,
                    colorId: colorId,
                    attachments: [{ fileUrl: image, title: 'thumbnail' }]
                }
            };
        }.bind(this)
    );

    this._addEvents(events, 0);
};

/**
 *
 * @param events
 * @param i
 * @param callback
 * @private
 */
Calendar.prototype._removeEvents = function(events, i, callback) {
    if (events[i]) {
        this._removeEvent(events[i]).then(
            function() {
                this._removeEvents(events, i + 1, callback);
            }.bind(this)
        );
    } else {
        callback();
    }
};

/**
 *
 * @param obj
 * @private
 */
Calendar.prototype._removeEvent = function(obj) {
    return new Promise(
        function(resolve, reject) {
            calendar.events.delete(
                obj,
                function(err, response) {
                    this._deleteCounter++;

                    if (!response) {
                        readline.clearLine(this.rl.output);
                        readline.cursorTo(this.rl.output, 0);

                        var p = Math.round(this._deleteCounter / this._eventsTodelete * 100);

                        this.rl.output.write(p.toString() + '%');

                        resolve();
                    } else {
                        reject();
                    }
                }.bind(this)
            );
        }.bind(this)
    );
};

/**
 *
 * @param events
 * @param i
 * @private
 */
Calendar.prototype._addEvents = function(events, i) {
    if (events[i]) {
        this._addEvent(events[i]).then(
            function() {
                this._addEvents(events, i + 1);
            }.bind(this)
        );
    } else {
        console.log('Finished.');
        process.exit();
    }
};

/**
 *
 * @param obj
 * @private
 */
Calendar.prototype._addEvent = function(obj) {
    return new Promise(
        function(resolve, reject) {
            calendar.events.insert(
                obj,
                function(err, response) {
                    if (err) {
                        console.log('The API returned an error: ' + err);

                        if (err.message === 'Rate Limit Exceeded') {
                            console.log('Waiting 100 seconds...');

                            // Wait 100 seconds
                            setTimeout(
                                function() {
                                    this._addEvent(obj).then(resolve);
                                }.bind(this),
                                100000
                            );
                        } else {
                            resolve();
                        }

                        return;
                    }

                    if (response.status === 'confirmed') {
                        console.log('- Event added: ', response.summary);

                        resolve();
                        return;
                    }

                    reject();
                }.bind(this)
            );
        }.bind(this)
    );
};

module.exports = Calendar;
