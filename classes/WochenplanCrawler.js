const https = require('https');

function WochenplanCrawler() {}

WochenplanCrawler.prototype.onData = function () {};

WochenplanCrawler.prototype.start = function () {
    const url =
        'https://api.rocketbeans.tv/v1/schedule/normalized?startDay=1534359943&endDay=1534619143';
    console.log('Crawling data from', url);

    https
        .get(url, resp => {
            const result = [];

            resp.on('data', chunk => result.push(chunk));
            resp.on('end', () => {
                const data = JSON.parse(result.join('')).data;

                this.onData.apply(
                    this,
                    data.map(day =>
                        day.elements.filter(item => item.type === 'live' || item.type === 'premiere').map(item => ({
                            title: item.title,
                            description: item.topic,
                            startTime: new Date(item.timeStart),
                            endTime: new Date(item.timeEnd),
                            type: item.type,
                            image: item.episodeImage
                        }))
                    )
                )
            });
        })
        .on('error', err => {
            console.log('Error: ' + err.message);
        });
};

module.exports = WochenplanCrawler;
