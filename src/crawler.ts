import { DateTime } from 'luxon';
import { get } from 'https';

interface Image {
    name: 'small' | 'medium' | 'large' | 'source';
    url: string;
    width: number;
    height: number;
}

interface Bohne {
    mgmtid: number;
    name: string;
    role: 'onair';
    images: Image[];
    episodeCount: number;
}

interface V1ScheduleNormalized {
    success: boolean;
    data: {
        date: string;
        elements: {
            id: number;
            title: string;
            topic: string;
            game: string;
            showId: number;
            episodeId: number;
            episodeImage: string;
            episodeImages: Image[];
            timeStart: string;
            timeEnd: string;
            publishingDate: string;
            duration: number;
            durationClass: number;
            bohnen: Bohne[];
            streamExclusive: boolean;
            type: 'live';
            links: any[];
            channelGroups: {
                mgmtId: number;
                type: 'talent';
                name: string;
                description: string;
                channelGroupIcon: Image[];
                channels: {
                    mgmtId: number;
                    channelGroupId: number;
                    title: string | null;
                    url: string;
                    serviceType: 'twitch';
                    platformId: string;
                    platformIcon: null;
                    platformThumbnail: null;
                    ytToken: null;
                    ytLiveChatId: null;
                    twitchChannel: string;
                    currentGame: null;
                    currentlyLive: false;
                    viewers: null;
                }[];
                bohnen: Bohne[];
                currentlyInMainContext: boolean;
                priority: number;
            }[];
            openEnd: boolean;
            highlight: boolean;
        }[];
    }[];
}

interface V1SchedulePublish {
    success: boolean;
    data: {
        date: string;
        elements: {
            id: number;
            bohnen: Bohne[];
            uploadDate: string;
            publishingDate: string | null;
            title: string;
            topic: string;
            showId: number;
            showTitle: string;
            showThumbnail: Image[];
            publishingDelayState: number;
            publishingDelayComment: null;
        }[];
    }[];
}

export interface NormalizedShow {
    title: string;
    description: string;
    startDateTime: DateTime;
    endDateTime: DateTime;
    type: 'live' | 'vod';
    image: string;
    bohnen: string[];
}

export async function crawler() {
    const start = Math.round(DateTime.now().startOf('day').toSeconds());
    const end = Math.round(
        DateTime.now().plus({ week: 1 }).endOf('week').toSeconds()
    );

    const [scheduleLive, scheduleVod] = await Promise.all([
        fetchJSON<V1ScheduleNormalized>(
            `https://api.rocketbeans.tv/v1/schedule/normalized?startDay=${start}&endDay=${end}`
        ),
        fetchJSON<V1SchedulePublish>(
            `https://api.rocketbeans.tv/v1/schedule/publish?from=${start}`
        )
    ]);

    const showsLive = scheduleLive.data
        .map(({ elements }) => {
            return elements.map<NormalizedShow>((item) => {
                const startDateTime = DateTime.fromISO(item.timeStart);
                const endDateTime = DateTime.fromISO(item.timeEnd);

                return {
                    title: item.title,
                    description: item.topic,
                    startDateTime,
                    endDateTime,
                    type: item.type,
                    image: item.episodeImage,
                    bohnen: item.bohnen.map((bohne) => bohne.name)
                };
            });
        })
        .flat();

    const showsVod = (
        await Promise.all(
            scheduleVod.data.map(({ elements }) => {
                return Promise.all(
                    elements.map<Promise<NormalizedShow>>(async (item) => {
                        const startDateTime = DateTime.fromISO(item.uploadDate);
                        let endDateTime = DateTime.fromISO(item.uploadDate);

                        const episode = await fetchJSON(
                            `https://api.rocketbeans.tv/v1/media/episode/${item.id}`
                        );

                        if (episode) {
                            const { duration } = episode.data.episodes[0];

                            endDateTime = DateTime.fromSeconds(
                                startDateTime.toSeconds() + duration
                            );
                        }

                        return {
                            title: item.title,
                            description: item.topic,
                            startDateTime,
                            endDateTime,
                            type: 'vod',
                            image: item.showThumbnail[0].url,
                            bohnen: item.bohnen.map((bohne) => bohne.name)
                        };
                    })
                );
            })
        )
    ).flat();

    return [...showsLive, ...showsVod];
}

async function fetchJSON<T = any>(url: string): Promise<T> {
    return new Promise((resolve, reject) => {
        get(url, (resp) => {
            const result: any[] = [];

            resp.on('data', (chunk) => result.push(chunk));
            resp.on('end', () => {
                resolve(JSON.parse(result.join('')));
            });
        }).on('error', (err) => {
            reject(err);
        });
    });
}
