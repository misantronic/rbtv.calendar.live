const https = require("https");
const { startOfDay, endOfWeek, endOfDay, addWeeks } = require("date-fns");

function WochenplanCrawler() {}

WochenplanCrawler.prototype.onData = function () {};

function fetchData(url) {
  return new Promise((resolve) => {
    console.log("Crawling data from", url);

    https
      .get(url, (resp) => {
        const result = [];

        resp.on("data", (chunk) => result.push(chunk));
        resp.on("end", () => {
          const data = JSON.parse(result.join("")).data;

          resolve(
            data
              .map((day) =>
                day.elements.map((item) => {
                  const startTime = new Date(item.timeStart || item.uploadDate);

                  return {
                    title: item.title,
                    description: item.topic,
                    startTime,
                    endTime: item.timeEnd ? new Date(item.timeEnd) : startTime,
                    type: item.type,
                    image:
                      item.episodeImage ||
                      (item.showThumbnail
                        ? item.showThumbnail[0].url
                        : undefined),
                    bohnen: (item.bohnen || []).map((bean) => bean.name)
                  };
                })
              )
              .reduce((memo, day) => [...memo, ...day], [])
          );
        });
      })
      .on("error", (err) => {
        console.log("Error: " + err.message);
      });
  });
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

  this.onData([...dataLive, ...dataVod]);
};

module.exports = WochenplanCrawler;
