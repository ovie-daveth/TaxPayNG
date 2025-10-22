const { Transaction, Document } = require('../models');
const { body, query } = require('express-validator');

const getUserTransactions = async (req, res, next) => {
  try {
    const { page, pageSize } = req.pagination;
    const { type, category, startDate, endDate, minAmount, maxAmount, tags } = req.query;

    // Build MongoDB query
    const query = { user_id: req.user.id };

    if (type) query.type = type;
    if (category) query.category = category;
    if (startDate) query.date = { ...query.date, $gte: new Date(startDate) };
    if (endDate) query.date = { ...query.date, $lte: new Date(endDate) };
    if (minAmount) query.amount = { ...query.amount, $gte: parseFloat(minAmount) };
    if (maxAmount) query.amount = { ...query.amount, $lte: parseFloat(maxAmount) };
    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      query.tags = { $in: tagArray };
    }

    const skip = (page - 1) * pageSize;

    const [transactions, total] = await Promise.all([
      Transaction.find(query)
        .populate('document_id')
        .sort({ date: -1 })
        .skip(skip)
        .limit(pageSize)
        .lean(),
      Transaction.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / pageSize);

    res.json({
      success: true,
      data: transactions,
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

const createTransaction = async (req, res, next) => {
  try {
    const transactionData = {
      ...req.body,
      user_id: req.user.id
    };

    const transaction = await Transaction.create(transactionData);

    // If transaction has attachments, create corresponding documents
    if (transactionData.attachments && transactionData.attachments.length > 0) {
      await createDocumentsFromAttachments(
        req.user.id,
        transaction._id,
        transactionData.attachments,
        transactionData.description,
        transactionData.date,
        transactionData.type
      );
    }

    const createdTransaction = await Transaction.findById(transaction._id)
      .populate('document_id');

    res.status(201).json({
      success: true,
      data: createdTransaction,
      message: 'Transaction created successfully'
    });
  } catch (error) {
    next(error);
  }
};

const updateTransaction = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const transaction = await Transaction.findOneAndUpdate(
      { _id: id, user_id: req.user.id },
      updateData,
      { new: true }
    );

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }

    // If attachments were updated, create documents for new attachments
    if (updateData.attachments && updateData.attachments.length > 0) {
      const existingAttachments = transaction.attachments || [];
      const newAttachments = updateData.attachments.filter(
        (url) => !existingAttachments.includes(url)
      );

      if (newAttachments.length > 0) {
        await createDocumentsFromAttachments(
          req.user.id,
          transaction._id,
          newAttachments,
          updateData.description || transaction.description,
          updateData.date || transaction.date,
          updateData.type || transaction.type
        );
      }
    }

    const updatedTransaction = await Transaction.findById(transaction._id)
      .populate('document_id');

    res.json({
      success: true,
      data: updatedTransaction,
      message: 'Transaction updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

const deleteTransaction = async (req, res, next) => {
  try {
    const { id } = req.params;

    const transaction = await Transaction.findOneAndDelete({
      _id: id,
      user_id: req.user.id
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }

    res.json({
      success: true,
      message: 'Transaction deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

const getTransactionSummary = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const query = { user_id: req.user.id };
    if (startDate) query.date = { ...query.date, $gte: new Date(startDate) };
    if (endDate) query.date = { ...query.date, $lte: new Date(endDate) };

    const transactions = await Transaction.find(query)
      .select('type category amount')
      .lean();

    const summary = {
      totalIncome: 0,
      totalExpenses: 0,
      netIncome: 0,
      transactionCount: transactions.length,
      categories: {}
    };

    transactions.forEach(transaction => {
      if (transaction.type === 'income') {
        summary.totalIncome += parseFloat(transaction.amount);
      } else {
        summary.totalExpenses += parseFloat(transaction.amount);
      }

      // Category breakdown
      if (!summary.categories[transaction.category]) {
        summary.categories[transaction.category] = { income: 0, expenses: 0, count: 0 };
      }
      
      summary.categories[transaction.category].count++;
      if (transaction.type === 'income') {
        summary.categories[transaction.category].income += parseFloat(transaction.amount);
      } else {
        summary.categories[transaction.category].expenses += parseFloat(transaction.amount);
      }
    });

    summary.netIncome = summary.totalIncome - summary.totalExpenses;

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    next(error);
  }
};

const getRecentTransactions = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    const transactions = await Transaction.find({ user_id: req.user.id })
      .populate('document_id')
      .sort({ date: -1 })
      .limit(limit)
      .lean();

    res.json({
      success: true,
      data: transactions
    });
  } catch (error) {
    next(error);
  }
};

// Helper function to create documents from attachments
const createDocumentsFromAttachments = async (userId, transactionId, attachmentUrls, description, date, type) => {
  try {
    for (let i = 0; i < attachmentUrls.length; i++) {
      const url = attachmentUrls[i];
      
      // Extract filename from URL
      const urlParts = url.split('/');
      const filename = urlParts[urlParts.length - 1] || `attachment-${i + 1}`;
      
      // Determine file type from URL
      const fileExtension = filename.split('.').pop()?.toLowerCase() || '';
      let fileType = 'document';
      let mimeType = 'application/octet-stream';
      
      if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExtension)) {
        fileType = 'image';
        mimeType = `image/${fileExtension === 'jpg' ? 'jpeg' : fileExtension}`;
      } else if (fileExtension === 'pdf') {
        fileType = 'pdf';
        mimeType = 'application/pdf';
      }
      
      // Determine document type based on transaction type
      const documentType = type === 'income' ? 'invoice' : 'receipt';
      
      // Create document record
      await Document.create({
        user_id: userId,
        name: `${description} - Attachment ${i + 1}`,
        original_name: filename,
        type: documentType,
        file_type: fileType,
        mime_type: mimeType,
        size: 0, // We don't have size info from URL
        url: url,
        thumbnail_url: fileType === 'image' ? url : null,
        uploaded_at: date,
        linked_transaction: transactionId,
        notes: `Auto-created from transaction: ${description}`
      });
    }
  } catch (error) {
    console.error('Error creating documents from attachments:', error);
    // Don't throw error - transaction creation should succeed even if document creation fails
  }
};

// Validation rules
const createTransactionValidation = [
  body('type').isIn(['income', 'expense']).withMessage('Type must be income or expense'),
  body('category').notEmpty().withMessage('Category is required'),
  body('amount').isNumeric().withMessage('Amount must be a number'),
  body('description').notEmpty().withMessage('Description is required'),
  body('date').isISO8601().withMessage('Date must be a valid date'),
  body('paymentMethod').optional().isString(),
  body('taxDeductible').optional().isBoolean(),
  body('notes').optional().isString(),
  body('tags').optional().isArray(),
  body('attachments').optional().isArray()
];

const updateTransactionValidation = [
  body('type').optional().isIn(['income', 'expense']).withMessage('Type must be income or expense'),
  body('category').optional().notEmpty().withMessage('Category cannot be empty'),
  body('amount').optional().isNumeric().withMessage('Amount must be a number'),
  body('description').optional().notEmpty().withMessage('Description cannot be empty'),
  body('date').optional().isISO8601().withMessage('Date must be a valid date'),
  body('paymentMethod').optional().isString(),
  body('taxDeductible').optional().isBoolean(),
  body('notes').optional().isString(),
  body('tags').optional().isArray(),
  body('attachments').optional().isArray()
];

const getTransactionsValidation = [
  query('type').optional().isIn(['income', 'expense']),
  query('category').optional().isString(),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('minAmount').optional().isFloat({ min: 0 }),
  query('maxAmount').optional().isFloat({ min: 0 }),
  query('tags').optional().isString()
];

module.exports = {
  getUserTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getTransactionSummary,
  getRecentTransactions,
  createTransactionValidation,
  updateTransactionValidation,
  getTransactionsValidation
};
