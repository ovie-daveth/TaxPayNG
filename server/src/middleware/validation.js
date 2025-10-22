const { validationResult } = require('express-validator');

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
  }
  
  next();
};

const validatePagination = (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 20;
  
  if (page < 1) {
    return res.status(400).json({
      success: false,
      error: 'Page must be greater than 0'
    });
  }
  
  if (pageSize < 1 || pageSize > 100) {
    return res.status(400).json({
      success: false,
      error: 'Page size must be between 1 and 100'
    });
  }
  
  req.pagination = { page, pageSize };
  next();
};

module.exports = {
  validateRequest,
  validatePagination
};
