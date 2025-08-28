// routes/employeeRoutes.js
const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// Admin create
router.post('/', authorize('admin'), async (req, res) => {
  try {
    const { name, email, department, position, phone, user } = req.body;
    if (user) {
      const found = await User.findById(user);
      if (!found) return res.status(400).json({ error: 'Provided user id not found' });
      const already = await Employee.findOne({ user: found._id });
      if (already) return res.status(400).json({ error: 'That user is already linked to an employee' });
    }
    const existingByEmail = await Employee.findOne({ email });
    if (existingByEmail) return res.status(400).json({ error: 'Employee with that email already exists' });

    const employee = await Employee.create({ name, email, department, position, phone, user: user || undefined });
    res.status(201).json(employee);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Admin list
router.get('/', authorize('admin'), async (req, res) => {
  try {
    const employees = await Employee.find().populate('user', 'name email role');
    res.json(employees);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Link user to employee
router.post('/:id/link-user', authorize('admin'), async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ error: 'Employee not found' });
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const already = await Employee.findOne({ user: user._id });
    if (already) return res.status(400).json({ error: 'That user is already linked' });
    employee.user = user._id;
    await employee.save();
    res.json(employee);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Admin delete
router.delete('/:id', authorize('admin'), async (req, res) => {
  try {
    const emp = await Employee.findById(req.params.id);
    if (!emp) return res.status(404).json({ error: 'Employee not found' });
    await emp.remove();
    res.json({ message: 'Employee removed' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
