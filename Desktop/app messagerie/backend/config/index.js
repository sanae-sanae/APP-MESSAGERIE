module.exports = {
    MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/chatapp',
    JWT_SECRET: process.env.JWT_SECRET || 'supersecretjwtkey',
    REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
    PORT: process.env.PORT || 5000,
    NODE_ENV: process.env.NODE_ENV || 'development'
};