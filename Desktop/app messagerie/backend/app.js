const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { notFound, errorHandler } = require('./utils/errorHandler');
const authRoutes = require('./routes/authRoutes');
const chatRoutes = require('./routes/chatRoutes');
const app = express();


app.use(cors());
app.use(express.json()); 
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes); 
app.get('/', (req, res) => {
    res.send('API is running...');
});
app.use(notFound);
app.use(errorHandler);

module.exports = app;