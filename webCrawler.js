var jsdom    = require("jsdom");
var moment   = require('moment');
var Backbone = require('backbone');

require('./classes/moment_locale_de');

var url = "http://www.rocketbeans.tv/wochenplan/";
var $;

console.log('Crawling data from', url);

function start(callback) {
	jsdom.env(
		url,
		["http://code.jquery.com/jquery.js"],
		function (err, window) {
			if (err) {
				throw err;
			}

			onLoad(window, callback);
		}
	);
}

function onLoad(window, callback) {
	$ = window.$;

	var shows      = [];
	var $scheduler = $('#schedule');
	var $days      = $scheduler.find('.day');

	$days.each(function (i, day) {
		var $day = $(day);

		// Look for date
		var dateString = $day.find('.dateHeader > span').text();
		var date       = moment(dateString, 'DD. MMM YYYY');

		// Look for live-events
		$day.find('.show .live').each(function (j, badge) {
			shows.push(
				parseShow('live', date, $(badge).closest('.show'))
			);
		});

		// Look for premiere-events
		$day.find('.show .premiere').each(function (j, badge) {
			shows.push(
				parseShow('premiere', date, $(badge).closest('.show'))
			);
		});
	});

	callback(shows);
}

function parseShow(type, date, $show) {
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
}

module.exports = {
	start: start
};
