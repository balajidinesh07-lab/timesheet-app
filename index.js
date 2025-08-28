// index.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const timesheetRoutes = require('./routes/timesheetRoutes');

const app = express();
app.use(cors());
app.use(express.json());

// connect mongo
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('Mongo connected'))
  .catch(err => {
    console.error('Mongo connection error', err);
    process.exit(1);
  });

// routes
app.use('/auth', authRoutes);
app.use('/employees', employeeRoutes);
app.use('/timesheets', timesheetRoutes);

// basic health
app.get('/', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
