import { crawler } from './crawler';
import { googleCalendar } from './calendar';

exports.handler = async (): Promise<any> => {
    const calendar = await googleCalendar(
        '5aj6musne0k96vbqlu43p8lgs0@group.calendar.google.com'
    );
    const shows = await crawler();

    await calendar.removeAllEvents();

    for (const show of shows) {
        await calendar.insert(show);
    }
};
