const { TaxCalculation } = require('../models');
const { body, query } = require('express-validator');

// Import the tax calculation logic (you'll need to implement this)
const calculateNigerianTax = (data) => {
  // This is a simplified version - you should implement the full Nigerian tax calculation
  const {
    businessType,
    period,
    income,
    rentPaid = 0,
    pensionContribution = 0,
    healthInsurance = 0,
    lifeInsurance = 0,
    charitableDonations = 0,
    businessExpenses = 0,
    dependents = 0
  } = data;

  // Basic tax calculation (simplified)
  const grossIncome = income;
  const adjustedGrossIncome = grossIncome - businessExpenses;
  
  // Reliefs
  const rentRelief = Math.min(rentPaid * 0.1, 200000); // 10% of rent, max 200k
  const pensionRelief = Math.min(pensionContribution * 0.2, 200000); // 20% of pension, max 200k
  const healthRelief = Math.min(healthInsurance * 0.1, 200000); // 10% of health insurance, max 200k
  const lifeRelief = Math.min(lifeInsurance * 0.1, 200000); // 10% of life insurance, max 200k
  const charitableRelief = Math.min(charitableDonations * 0.1, 200000); // 10% of donations, max 200k
  
  const totalReliefs = rentRelief + pensionRelief + healthRelief + lifeRelief + charitableRelief;
  const taxableIncome = Math.max(0, adjustedGrossIncome - totalReliefs);

  // Nigerian tax brackets (simplified)
  const taxBrackets = [
    { min: 0, max: 300000, rate: 0.07 },
    { min: 300000, max: 600000, rate: 0.11 },
    { min: 600000, max: 1100000, rate: 0.15 },
    { min: 1100000, max: 1600000, rate: 0.19 },
    { min: 1600000, max: 3200000, rate: 0.21 },
    { min: 3200000, max: Infinity, rate: 0.24 }
  ];

  let totalTax = 0;
  const calculatedBrackets = [];

  for (const bracket of taxBrackets) {
    if (taxableIncome > bracket.min) {
      const taxableInBracket = Math.min(taxableIncome - bracket.min, bracket.max - bracket.min);
      const taxInBracket = taxableInBracket * bracket.rate;
      totalTax += taxInBracket;
      
      calculatedBrackets.push({
        amount: taxableInBracket,
        rate: bracket.rate,
        tax: taxInBracket
      });
    }
  }

  const monthlySetAside = totalTax / 12;
  const quarterlyPayments = [
    { quarter: 'Q1', amount: totalTax * 0.25 },
    { quarter: 'Q2', amount: totalTax * 0.25 },
    { quarter: 'Q3', amount: totalTax * 0.25 },
    { quarter: 'Q4', amount: totalTax * 0.25 }
  ];

  const effectiveRate = totalTax / grossIncome;

  return {
    grossIncome,
    businessExpenses,
    adjustedGrossIncome,
    reliefs: {
      rentRelief,
      pension: pensionRelief,
      healthInsurance: healthRelief,
      lifeInsurance: lifeRelief,
      charitable: charitableRelief
    },
    totalReliefs,
    taxableIncome,
    taxBrackets: calculatedBrackets,
    totalTax,
    monthlySetAside,
    quarterlyPayments,
    effectiveRate: (effectiveRate * 100).toFixed(2) + '%'
  };
};

const getUserCalculations = async (req, res, next) => {
  try {
    const { page, pageSize } = req.pagination;

    const skip = (page - 1) * pageSize;

    const [calculations, total] = await Promise.all([
      TaxCalculation.find({ user_id: req.user.id })
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(pageSize)
        .lean(),
      TaxCalculation.countDocuments({ user_id: req.user.id })
    ]);

    const totalPages = Math.ceil(total / pageSize);

    res.json({
      success: true,
      data: calculations,
      pagination: {
        page,
        limit: pageSize,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    next(error);
  }
};

const createCalculation = async (req, res, next) => {
  try {
    const calculationData = {
      ...req.body,
      user_id: req.user.id
    };

    // Calculate tax using the calculator
    const taxResult = calculateNigerianTax(calculationData);

    const newCalculation = {
      ...calculationData,
      result: taxResult
    };

    const calculation = await TaxCalculation.create(newCalculation);

    res.status(201).json({
      success: true,
      data: calculation,
      message: 'Tax calculation created successfully'
    });
  } catch (error) {
    next(error);
  }
};

const updateCalculation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const calculation = await TaxCalculation.findOne({
      _id: id, 
      user_id: req.user.id
    });

    if (!calculation) {
      return res.status(404).json({
        success: false,
        error: 'Tax calculation not found'
      });
    }

    // If calculation data is being updated, recalculate the result
    if (updateData.businessType || updateData.period || updateData.income || 
        updateData.rentPaid || updateData.pensionContribution || updateData.healthInsurance ||
        updateData.lifeInsurance || updateData.charitableDonations || updateData.businessExpenses ||
        updateData.dependents) {
      
      const updatedData = {
        ...calculation.toObject(),
        ...updateData
      };

      // Recalculate tax
      const newTaxResult = calculateNigerianTax(updatedData);
      updateData.result = newTaxResult;
    }

    const updatedCalculation = await TaxCalculation.findOneAndUpdate(
      { _id: id, user_id: req.user.id },
      updateData,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      data: updatedCalculation,
      message: 'Tax calculation updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

const deleteCalculation = async (req, res, next) => {
  try {
    const { id } = req.params;

    const calculation = await TaxCalculation.findOneAndDelete({
      _id: id, 
      user_id: req.user.id
    });

    if (!calculation) {
      return res.status(404).json({
        success: false,
        error: 'Tax calculation not found'
      });
    }

    res.json({
      success: true,
      message: 'Tax calculation deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

const getCalculationsByBusinessType = async (req, res, next) => {
  try {
    const { businessType } = req.params;

    const calculations = await TaxCalculation.find({
      user_id: req.user.id,
      business_type: businessType
    }).sort({ created_at: -1 });

    res.json({
      success: true,
      data: calculations
    });
  } catch (error) {
    next(error);
  }
};

const getCalculationsByPeriod = async (req, res, next) => {
  try {
    const { period } = req.params;

    const calculations = await TaxCalculation.find({
      user_id: req.user.id,
      period: period
    }).sort({ created_at: -1 });

    res.json({
      success: true,
      data: calculations
    });
  } catch (error) {
    next(error);
  }
};

const getLatestCalculation = async (req, res, next) => {
  try {
    const calculation = await TaxCalculation.findOne({
      user_id: req.user.id
    }).sort({ created_at: -1 });

    res.json({
      success: true,
      data: calculation
    });
  } catch (error) {
    next(error);
  }
};

const getCalculationStats = async (req, res, next) => {
  try {
    const calculations = await TaxCalculation.find({
      user_id: req.user.id
    });

    const stats = {
      totalCalculations: calculations.length,
      averageTax: 0,
      totalTaxPaid: 0,
      byBusinessType: {},
      byPeriod: {},
      recentCalculations: calculations.slice(0, 5)
    };

    if (calculations.length > 0) {
      let totalTax = 0;
      calculations.forEach(calc => {
        totalTax += parseFloat(calc.result.totalTax);

        // Count by business type
        if (!stats.byBusinessType[calc.business_type]) {
          stats.byBusinessType[calc.business_type] = 0;
        }
        stats.byBusinessType[calc.business_type]++;

        // Count by period
        if (!stats.byPeriod[calc.period]) {
          stats.byPeriod[calc.period] = 0;
        }
        stats.byPeriod[calc.period]++;
      });

      stats.averageTax = totalTax / calculations.length;
      stats.totalTaxPaid = totalTax;
    }

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

const compareCalculations = async (req, res, next) => {
  try {
    const { calculationId1, calculationId2 } = req.params;

    const calc1 = await TaxCalculation.findOne({
      _id: calculationId1, 
      user_id: req.user.id
    });

    const calc2 = await TaxCalculation.findOne({
      _id: calculationId2, 
      user_id: req.user.id
    });

    if (!calc1 || !calc2) {
      return res.status(404).json({
        success: false,
        error: 'One or both calculations not found'
      });
    }

    const differences = {
      incomeDifference: parseFloat(calc2.income) - parseFloat(calc1.income),
      taxDifference: parseFloat(calc2.result.totalTax) - parseFloat(calc1.result.totalTax),
      effectiveRateDifference: parseFloat(calc2.result.effectiveRate) - parseFloat(calc1.result.effectiveRate)
    };

    res.json({
      success: true,
      data: {
        calculation1: calc1,
        calculation2: calc2,
        differences
      }
    });
  } catch (error) {
    next(error);
  }
};

// Validation rules
const createCalculationValidation = [
  body('businessType').notEmpty().withMessage('Business type is required'),
  body('period').isIn(['monthly', 'quarterly', 'yearly']).withMessage('Invalid period'),
  body('income').isFloat({ min: 0 }).withMessage('Income must be a positive number'),
  body('rentPaid').optional().isFloat({ min: 0 }).withMessage('Rent paid must be a positive number'),
  body('pensionContribution').optional().isFloat({ min: 0 }).withMessage('Pension contribution must be a positive number'),
  body('healthInsurance').optional().isFloat({ min: 0 }).withMessage('Health insurance must be a positive number'),
  body('lifeInsurance').optional().isFloat({ min: 0 }).withMessage('Life insurance must be a positive number'),
  body('charitableDonations').optional().isFloat({ min: 0 }).withMessage('Charitable donations must be a positive number'),
  body('businessExpenses').optional().isFloat({ min: 0 }).withMessage('Business expenses must be a positive number'),
  body('dependents').optional().isInt({ min: 0 }).withMessage('Dependents must be a non-negative integer')
];

const updateCalculationValidation = [
  body('businessType').optional().notEmpty().withMessage('Business type cannot be empty'),
  body('period').optional().isIn(['monthly', 'quarterly', 'yearly']).withMessage('Invalid period'),
  body('income').optional().isFloat({ min: 0 }).withMessage('Income must be a positive number'),
  body('rentPaid').optional().isFloat({ min: 0 }).withMessage('Rent paid must be a positive number'),
  body('pensionContribution').optional().isFloat({ min: 0 }).withMessage('Pension contribution must be a positive number'),
  body('healthInsurance').optional().isFloat({ min: 0 }).withMessage('Health insurance must be a positive number'),
  body('lifeInsurance').optional().isFloat({ min: 0 }).withMessage('Life insurance must be a positive number'),
  body('charitableDonations').optional().isFloat({ min: 0 }).withMessage('Charitable donations must be a positive number'),
  body('businessExpenses').optional().isFloat({ min: 0 }).withMessage('Business expenses must be a positive number'),
  body('dependents').optional().isInt({ min: 0 }).withMessage('Dependents must be a non-negative integer')
];

module.exports = {
  getUserCalculations,
  createCalculation,
  updateCalculation,
  deleteCalculation,
  getCalculationsByBusinessType,
  getCalculationsByPeriod,
  getLatestCalculation,
  getCalculationStats,
  compareCalculations,
  createCalculationValidation,
  updateCalculationValidation
};
