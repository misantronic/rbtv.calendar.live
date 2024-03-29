import { get } from 'https';
import { DateTime } from 'luxon';

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

interface ChannelGroup {
    mgmtId: number;
    type: 'talent' | 'main';
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
            type: 'live' | 'vod' | 'stream';
            links: any[];
            channelGroups: ChannelGroup[];
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
    type: 'live' | 'vod' | 'stream';
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

    const allShowsLive = scheduleLive.data
        .map(({ elements }) => {
            return elements.map<NormalizedShow>((item) => {
                const startDateTime = DateTime.fromISO(item.timeStart);
                const endDateTime = DateTime.fromISO(item.timeEnd);

                item.channelGroups[0].type;

                return {
                    title: item.title,
                    description: item.topic,
                    startDateTime,
                    endDateTime,
                    type: item.channelGroups.some(({ type }) => type === 'main')
                        ? item.type
                        : 'stream',
                    image: item.episodeImage,
                    bohnen: item.bohnen.map((bohne) => bohne.name)
                };
            });
        })
        .flat();

    const showsLive = allShowsLive.filter(({ type }) => type === 'live');

    const showsStreams = allShowsLive.filter(({ type }) => type === 'stream');

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
    )
        .flat()
        .filter(({ type }) => type === 'vod');

    return { showsLive, showsVod, showsStreams };
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
