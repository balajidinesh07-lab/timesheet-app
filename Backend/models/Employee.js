// models/Employee.js
const mongoose = require('mongoose');

const EmployeeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  department: { type: String },
  position: { type: String },
  phone: { type: String },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

EmployeeSchema.index({ user: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Employee', EmployeeSchema);
