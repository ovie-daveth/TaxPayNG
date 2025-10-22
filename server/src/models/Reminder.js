const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: ['tax_deadline', 'payment_due', 'document_submission', 'other']
  },
  due_date: {
    type: Date,
    required: true
  },
  priority: {
    type: String,
    required: true,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  is_completed: {
    type: Boolean,
    default: false
  },
  completed_at: {
    type: Date
  },
  recurring: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  }
}, {
  timestamps: true
});

// Indexes for better performance
reminderSchema.index({ user_id: 1 });
reminderSchema.index({ due_date: 1 });
reminderSchema.index({ is_completed: 1 });
reminderSchema.index({ type: 1 });
reminderSchema.index({ priority: 1 });
reminderSchema.index({ user_id: 1, due_date: 1 });

const Reminder = mongoose.model('Reminder', reminderSchema);

module.exports = Reminder;