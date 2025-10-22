const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  original_name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: ['receipt', 'invoice', 'proof', 'other']
  },
  file_type: {
    type: String,
    required: true,
    enum: ['pdf', 'image', 'document']
  },
  mime_type: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true,
    min: 0
  },
  url: {
    type: String,
    required: true,
    trim: true
  },
  thumbnail_url: {
    type: String,
    trim: true
  },
  uploaded_at: {
    type: Date,
    default: Date.now
  },
  linked_transaction: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction'
  },
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Indexes for better performance
documentSchema.index({ user_id: 1 });
documentSchema.index({ type: 1 });
documentSchema.index({ file_type: 1 });
documentSchema.index({ uploaded_at: -1 });
documentSchema.index({ linked_transaction: 1 });

const Document = mongoose.model('Document', documentSchema);

module.exports = Document;