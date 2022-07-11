import { crawler } from './crawler';
import { googleCalendar } from './calendar';

export const handler = async () => {
    const { showsLive, showsVod } = await crawler();

    async function handleLiveAndVod() {
        console.log('-- LIVE and VOD --');

        const calendar = await googleCalendar(
            '5aj6musne0k96vbqlu43p8lgs0@group.calendar.google.com'
        );

        await calendar.removeAllEvents();

        for (const show of [...showsLive, ...showsVod]) {
            await calendar.insert(show);
        }
    }

    async function handleLive() {
        console.log('-- VOD --');

        const calendar = await googleCalendar(
            'oq3rpredemlhs1aejld2qdh4i8@group.calendar.google.com'
        );

        await calendar.removeAllEvents();

        for (const show of showsLive) {
            await calendar.insert(show);
        }
    }

    await handleLiveAndVod();
    await handleLive();
};
