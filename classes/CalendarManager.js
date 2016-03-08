var GoogleAuth = require('./GoogleAuth');
var Calendar   = require('./Calendar');

function CalendarManager() {

}

CalendarManager.prototype.init = function (data) {
	this.data = data;

	var googleAuth = new GoogleAuth();

	googleAuth.start(this._onAuthorized.bind(this));
};

CalendarManager.prototype._onAuthorized = function(OAuth2) {
	this.OAuth2 = OAuth2;

	this._setupCalendar();
};

CalendarManager.prototype._setupCalendar = function () {
	this.calendar = new Calendar('5aj6musne0k96vbqlu43p8lgs0@group.calendar.google.com', this.OAuth2);
	this.calendar.removeAllEvents().then(this._onEventsRemoved.bind(this));
};

CalendarManager.prototype._insertEvents = function () {
	this.calendar.insertEvents(this.data);
};

CalendarManager.prototype._onEventsRemoved = function () {
	this._insertEvents();
};

module.exports = CalendarManager;