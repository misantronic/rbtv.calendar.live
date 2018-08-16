const https = require('https');
const {
    startOfDay,
    endOfWeek,
    endOfDay,
    addWeeks
} = require('date-fns')

function WochenplanCrawler() {}

WochenplanCrawler.prototype.onData = function () {};

WochenplanCrawler.prototype.start = function () {
    const startDay = Math.round(startOfDay(new Date()).getTime() / 1000);
    const endDay = Math.round(endOfWeek(addWeeks(new Date(), 1)) / 1000);
    const url =
        `https://api.rocketbeans.tv/v1/schedule/normalized?startDay=${startDay}&endDay=${endDay}`;
    console.log('Crawling data from', url);

    https
        .get(url, resp => {
            const result = [];

            resp.on('data', chunk => result.push(chunk));
            resp.on('end', () => {
                const data = JSON.parse(result.join('')).data;

                this.onData(
                    data.map(day =>
                        day.elements.filter(item => item.type === 'live' || item.type === 'premiere').map(item => ({
                            title: item.title,
                            description: item.topic,
                            startTime: new Date(item.timeStart),
                            endTime: new Date(item.timeEnd),
                            type: item.type,
                            image: item.episodeImage,
                            bohnen: item.bohnen.map(bean => bean.name)
                        }))
                    ).reduce((memo, day) => [...memo, ...day], [])
                )
            });
        })
        .on('error', err => {
            console.log('Error: ' + err.message);
        });
};

module.exports = WochenplanCrawler;
