require('dotenv').config();

const Segment = require('analytics-node');
const analytics = new Segment(process.env.SEGMENT_WRITE_KEY);
// the track function uses `this` internally
const track = analytics.track.bind(analytics);


module.exports = track;
