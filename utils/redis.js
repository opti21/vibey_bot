const Redis = require('ioredis');
const redis = new Redis({ password: process.env.REDIS_PASS });

module.exports = redis
