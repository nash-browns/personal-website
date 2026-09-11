export const REFRESH_INTERVAL_MS = 5 * 60 * 1000;
export const OLD_READING_MS = 2 * 60 * 60 * 1000;

const rivers = {
    'big-sioux': {
        name: 'Big Sioux River',
        timeZone: 'America/Chicago',
        gauges: [
            { id: 'USGS-06481500', name: 'Skunk Creek at Sioux Falls' },
            { id: 'USGS-06482000', name: 'Big Sioux River at Sioux Falls' },
            { id: 'USGS-06482020', name: 'Big Sioux River at North Cliff Avenue' },
        ],
    },
    kansas: {
        name: 'Kansas River',
        timeZone: 'America/Chicago',
        gauges: [
            { id: 'USGS-06887500', name: 'Kansas River at Wamego' },
            { id: 'USGS-06889000', name: 'Kansas River at Topeka' },
            { id: 'USGS-06892350', name: 'Kansas River at De Soto' },
        ],
    },
};

export function getRiverGauges(river) {
    return Object.hasOwn(rivers, river) ? rivers[river] : null;
}

export const gaugeUrl = id => `https://waterdata.usgs.gov/monitoring-location/${id}/`;

export function isOldReading(observedAt, now) {
    return observedAt !== null && now - Date.parse(observedAt) > OLD_READING_MS;
}
