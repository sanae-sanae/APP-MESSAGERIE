require('dotenv').config();
const http = require('http');
const app = require('./app'); 
const config = require('./config');
const connectDB = require('./config/db'); 
const { initSocket } = require('./services/socketService');
connectDB();

const server = http.createServer(app);
initSocket(server);

server.listen(config.PORT, () => {
    console.log(`Server running on port ${config.PORT} in ${config.NODE_ENV} mode`);
});


process.on('unhandledRejection', (err, promise) => {
    console.log(`Error: ${err.message}`);
    server.close(() => process.exit(1));
});