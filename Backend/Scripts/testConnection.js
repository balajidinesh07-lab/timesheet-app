// scripts/testConnection.js
require('dotenv').config();
const mongoose = require('mongoose');

const uri = process.env.MONGO_URI || `mongodb+srv://${encodeURIComponent(process.env.DB_USER)}:${encodeURIComponent(process.env.DB_PASS)}@${process.env.DB_HOST}/${process.env.DB_NAME}${process.env.MONGO_OPTIONS || ''}`;

(async () => {
  try {
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log("✅ Connected to MongoDB Atlas!");
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("❌ Connection failed:", err.message);
    process.exit(1);
  }
})();
