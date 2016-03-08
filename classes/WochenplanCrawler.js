var jsdom  = require("jsdom");
var moment = require('moment');

require('./../lib/moment_locale_de');

var url = "http://www.rocketbeans.tv/wochenplan/";
var $;

function WochenplanCrawler() {

}

WochenplanCrawler.prototype.onData = function() {};

WochenplanCrawler.prototype.start = function () {
	console.log('Crawling data from', url);

	var onData = this.onData;

	jsdom.env(
		url,
		["http://code.jquery.com/jquery.js"],
		function (err, window) {
			if (err) {
				throw err;
			}

			this._onLoad(window, function (data) {
				onData(data);
			});
		}.bind(this)
	);
};

WochenplanCrawler.prototype._onLoad = function(window, callback) {
	$ = window.$;

	var shows      = [];
	var $scheduler = $('#schedule');
	var $days      = $scheduler.find('.day');

	$days.each(function (i, day) {
		var $day = $(day);

		// Look for date
		var dateString = $day.find('.dateHeader > span').text();
		var date       = moment(dateString, 'DD. MMM YYYY');

		// Remove News
		$day.find('.showDetails > h4:contains(RB News)').closest('.show').remove();

		// Look for live-events
		$day.find('.show .live').each(function (j, badge) {
			shows.push(
				this._parseShow('live', date, $(badge).closest('.show'))
			);
		}.bind(this));

		// Look for premiere-events
		$day.find('.show .premiere').each(function (j, badge) {
			shows.push(
				this._parseShow('premiere', date, $(badge).closest('.show'))
			);
		}.bind(this));
	}.bind(this));

	callback(shows);
};

WochenplanCrawler.prototype._parseShow = function(type, date, $show) {
	var startTime   = moment(date.format('YYYY-MM-DD') + ' ' + $show.find('.scheduleTime').text(), 'YYYY-MM-DD HH:mm');
	var title       = $show.find('.showDetails > h4').text();
	var description = $show.find('.game').text();
	var duration    = $show.find('.showDuration').text();

	// Calculate duration in minutes
	var durationMinutes = 0;
	var durationHours   = 0;

	duration.replace(/(\d+) Std\./i, function (str, $1) {
		durationHours = parseInt($1)
	});

	duration.replace(/(\d+) Min\./i, function (str, $1) {
		durationMinutes = parseInt($1)
	});

	var durationTotal = durationHours * 60 + durationMinutes;

	var endTime = startTime.clone().add(durationTotal, 'minutes');

	return {
		title: title,
		description: description,
		startTime: startTime,
		endTime: endTime,
		type: type
	};
};

module.exports = WochenplanCrawler;