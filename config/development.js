module.exports = {
    port: process.env.PORT || 3001,
    gateway: process.env.GATEWAY || 'localhost:3003',
    ssl: false // alternatively - ssl: { key: 'path to ssl private key', cert: 'path to ssl certificate' }
};
