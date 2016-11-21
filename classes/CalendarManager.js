var GoogleAuth = require('./GoogleAuth');
var Calendar   = require('./Calendar');

var googleAuth;

function CalendarManager(calendarId) {
	this.calendarId = calendarId;
}

CalendarManager.prototype.init = function (data) {
	this.data = data || this.data;

	googleAuth = new GoogleAuth();

	googleAuth.start(this._onAuthorized.bind(this));
};

CalendarManager.prototype._onAuthorized = function(OAuth2) {
	this.OAuth2 = OAuth2;

	this._setupCalendar();
};

CalendarManager.prototype._setupCalendar = function () {
	this.calendar = new Calendar(this.calendarId, this.OAuth2);
	this.calendar.removeAllEvents()
		.then(this._onEventsRemoved.bind(this), function () {
			googleAuth.resetToken();
			this.init();
		}.bind(this));
};

CalendarManager.prototype._insertEvents = function () {
	this.calendar.insertEvents(this.data);
};

CalendarManager.prototype._onEventsRemoved = function () {
	this._insertEvents();
};

module.exports = CalendarManager;