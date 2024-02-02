import { googleCalendar } from './calendar';
import { crawler } from './crawler';

export const handler = async () => {
    const { showsLive, showsVod, showsStreams } = await crawler();

    async function handleVod() {
        console.log('-- VOD --');

        const calendar = await googleCalendar(
            '5aj6musne0k96vbqlu43p8lgs0@group.calendar.google.com'
        );

        await calendar.removeAllEvents();

        for (const show of showsVod) {
            await calendar.insert(show);
        }
    }

    async function handleLive() {
        console.log('-- LIVE --');

        const calendar = await googleCalendar(
            'oq3rpredemlhs1aejld2qdh4i8@group.calendar.google.com'
        );

        await calendar.removeAllEvents();

        for (const show of showsLive) {
            await calendar.insert(show);
        }
    }

    async function handleStreams() {
        console.log('-- STREAMS --');

        const calendar = await googleCalendar(
            '1fb72d01aecf68794882faa733b5a0a4bb8cfd8247b407af5e08e3cf19eb406c@group.calendar.google.com'
        );

        await calendar.removeAllEvents();

        for (const show of showsStreams) {
            await calendar.insert(show);
        }
    }

    await handleVod();
    await handleLive();
    await handleStreams();
};
