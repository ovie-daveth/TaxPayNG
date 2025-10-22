const mongoose = require('mongoose');

const taxCalculationSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  business_type: {
    type: String,
    required: true,
    trim: true
  },
  period: {
    type: String,
    required: true,
    enum: ['monthly', 'quarterly', 'yearly']
  },
  income: {
    type: Number,
    required: true,
    min: 0
  },
  rent_paid: {
    type: Number,
    default: 0,
    min: 0
  },
  pension_contribution: {
    type: Number,
    default: 0,
    min: 0
  },
  health_insurance: {
    type: Number,
    default: 0,
    min: 0
  },
  life_insurance: {
    type: Number,
    default: 0,
    min: 0
  },
  charitable_donations: {
    type: Number,
    default: 0,
    min: 0
  },
  business_expenses: {
    type: Number,
    default: 0,
    min: 0
  },
  dependents: {
    type: Number,
    default: 0,
    min: 0
  },
  result: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  }
}, {
  timestamps: true
});

// Indexes for better performance
taxCalculationSchema.index({ user_id: 1 });
taxCalculationSchema.index({ business_type: 1 });
taxCalculationSchema.index({ period: 1 });
taxCalculationSchema.index({ createdAt: -1 });

const TaxCalculation = mongoose.model('TaxCalculation', taxCalculationSchema);

module.exports = TaxCalculation;