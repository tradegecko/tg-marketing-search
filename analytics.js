require('dotenv').config();
const Segment = require('analytics-node');
const analytics = new Segment(process.env.SEGMENT_WRITE_KEY);

let { track } = analytics;


module.exports = track;
