import { calendar_v3, google } from 'googleapis';
import type { NormalizedShow } from './crawler';
import { authorize } from './google-auth';

async function wait<T = unknown>(delay: number) {
    return new Promise<T>((resolve) => {
        setTimeout(resolve, delay);
    });
}

async function handleRateLimit(e: Error) {
    if (e.message === 'Rate Limit Exceeded') {
        await wait(100000);
    } else {
        throw e;
    }
}

export async function googleCalendar(calendarId: string) {
    const auth = await authorize();
    const calendar = google.calendar({ version: 'v3', auth });

    const api = {
        async getEvents() {
            return (
                (
                    await calendar.events.list({
                        singleEvents: true,
                        calendarId
                    })
                ).data.items ?? []
            );
        },

        async removeAllEvents() {
            console.log('Calendar.removeAllEvents()');

            const events = await api.getEvents();

            for (const event of events) {
                await api.delete(event);
            }
        },

        async delete(event: calendar_v3.Schema$Event) {
            console.log(`Calendar.delete(${event.summary})`);

            try {
                await calendar.events.delete({
                    calendarId,
                    eventId: event.id!
                });
            } catch (e) {
                try {
                    await handleRateLimit(e as Error);
                    await api.delete(event);
                } catch (e) {}
            }
        },

        async insert(event: NormalizedShow) {
            console.log(`Calendar.insert(${event.title})`);

            const summary = [event.title, event.description]
                .filter(Boolean)
                .join(' - ');
            let description = event.description;

            if (event.bohnen?.length) {
                // prettier-ignore
                description = `${description}\n\nmit ${event.bohnen.join(', ')}`
            }

            const colorId = (() => {
                switch (event.type) {
                    case 'live':
                        return '11';
                    case 'vod':
                        return '9';
                    case 'stream':
                        return '3';
                }
            })();

            return new Promise<void>(async (resolve, reject) => {
                try {
                    await calendar.events.insert({
                        calendarId,
                        supportsAttachments: true,
                        requestBody: {
                            summary,
                            description,
                            colorId,
                            start: {
                                dateTime: event.startDateTime.toISO(),
                                timeZone: 'Europe/Berlin'
                            },
                            end: {
                                dateTime: event.endDateTime.toISO(),
                                timeZone: 'Europe/Berlin'
                            },
                            source: {
                                title: 'thumbnail',
                                url: event.image
                            }
                        }
                    });

                    resolve();
                } catch (e) {
                    try {
                        await handleRateLimit(e as Error);
                        resolve(api.insert(event));
                    } catch (e) {
                        reject(e);
                    }
                }
            });
        }
    };

    return api;
}
