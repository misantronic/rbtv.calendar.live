const https = require("https");
const { startOfDay, endOfWeek, endOfDay, addWeeks } = require("date-fns");

function WochenplanCrawler() {}

WochenplanCrawler.prototype.onData = function () {};

function fetch(url) {
    console.time(`fetch success: ${url}`);
    console.time(`fetch failed: ${url}`);

    return new Promise((resolve, reject) => {
        https
            .get(url, (resp) => {
                const result = [];

                resp.on("data", (chunk) => result.push(chunk));
                resp.on("end", () => {
                    const data = JSON.parse(result.join(""));

                    console.timeEnd(`fetch success: ${url}`);
                    resolve(data);
                });
            })
            .on("error", (err) => {
                console.error("fetch error", err);
                console.timeEnd(`fetch failed: ${url}`);
                reject(undefined);
            });
    });
}

async function fetchData(url) {
    const data = (await fetch(url)).data;

    const parsedData = await Promise.all(
        data.map(async (day) =>
            day.elements.map(async (item) => {
                const startTime = new Date(item.timeStart || item.uploadDate);
                let endTime = item.timeEnd ? new Date(item.timeEnd) : undefined;

                if (!endTime) {
                    const episode = await fetch(
                        `https://api.rocketbeans.tv/v1/media/episode/${item.id}`
                    );

                    if (episode) {
                        const { duration } = episode.data.episodes[0];

                        endTime = new Date(
                            startTime.getTime() + duration * 1000
                        );
                    }
                }

                endTime = endTime || startTime;

                return {
                    title: item.title,
                    description: item.topic,
                    startTime,
                    endTime,
                    type: item.type,
                    image:
                        item.episodeImage ||
                        (item.showThumbnail
                            ? item.showThumbnail[0].url
                            : undefined),
                    bohnen: (item.bohnen || []).map((bean) => bean.name),
                };
            })
        )
    );

    return parsedData.reduce((memo, day) => [...memo, ...day], []);
}

WochenplanCrawler.prototype.start = async function () {
    const startDay = Math.round(startOfDay(new Date()).getTime() / 1000);
    const endDay = Math.round(endOfWeek(addWeeks(new Date(), 1)) / 1000);

    const dataLive = await fetchData(
        `https://api.rocketbeans.tv/v1/schedule/normalized?startDay=${startDay}&endDay=${endDay}`
    );
    const dataVod = await fetchData(
        `https://api.rocketbeans.tv/v1/schedule/publish?from=${startDay}`
    );

    console.log({ dataLive, dataVod });

    this.onData([...dataLive, ...dataVod]);
};

module.exports = WochenplanCrawler;
