var jsdom    = require("jsdom");
var moment   = require('moment');
var Backbone = require('backbone');

require('./classes/moment_locale_de');

var url = "http://www.rocketbeans.tv/wochenplan/";

console.log('Crawling data from', url);

function start(callback) {
	jsdom.env(
		url,
		["http://code.jquery.com/jquery.js"],
		function (err, window) {
			if (err) {
				throw err;
			}

			parse(window, callback);
		}
	);
}

function parse(window, callback) {
	var $    = window.$;
	var data = [];

	var $scheduler = $('#schedule');
	var $days      = $scheduler.find('.day');

	$days.each(function (i, day) {
		var $day   = $(day);
		var dayObj = {};

		// Look for date
		var dateString = $day.find('.dateHeader > span').text();
		var date       = moment(dateString, 'DD. MMM YYYY');

		dayObj.date  = date;
		dayObj.shows = [];

		// Look for live-events
		$day.find('.show .live').each(function (j, liveBadge) {
			var $show = $(liveBadge).closest('.show');

			var datetime       = moment(date.format('YYYY-MM-DD') + ' ' + $show.find('.scheduleTime').text(), 'YYYY-MM-DD HH:mm');
			var title          = $show.find('.showDetails > h4').text();
			var description    = $show.find('.game').text();
			var duration       = $show.find('.showDuration').text();

			dayObj.shows.push({
				title: title,
				datetime: datetime,
				description: description,
				duration: duration
			});
		});

		data.push(dayObj);
	});

	callback(data);
}

module.exports = {
	start: start
};
