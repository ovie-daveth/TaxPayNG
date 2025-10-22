const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password_hash: {
    type: String,
    required: true
  },
  first_name: {
    type: String,
    required: true,
    trim: true
  },
  last_name: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  business_type: {
    type: String,
    required: true,
    enum: ['freelancer', 'sme', 'individual']
  },
  tax_id: {
    type: String,
    trim: true
  },
  preferences: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  address: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  email_verified: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for better performance
userSchema.index({ business_type: 1 });

const User = mongoose.model('User', userSchema);

module.exports = User;