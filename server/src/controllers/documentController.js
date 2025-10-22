const { Document, Transaction } = require('../models');
const { body, query } = require('express-validator');

// Since you're using ImageKit, we'll work with URLs instead of file uploads

const getUserDocuments = async (req, res, next) => {
  try {
    const { page, pageSize } = req.pagination;
    const { search, type, fileType, linkedTransaction, startDate, endDate } = req.query;

    // Build MongoDB query
    const query = { user_id: req.user.id };

    if (type) query.type = type;
    if (fileType) query.file_type = fileType;
    if (linkedTransaction !== undefined) {
      if (linkedTransaction === 'true') {
        query.linked_transaction = { $ne: null };
      } else {
        query.linked_transaction = null;
      }
    }
    if (startDate) query.uploaded_at = { ...query.uploaded_at, $gte: new Date(startDate) };
    if (endDate) query.uploaded_at = { ...query.uploaded_at, $lte: new Date(endDate) };

    // Add search filter to MongoDB query
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { original_name: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * pageSize;

    const [documents, total] = await Promise.all([
      Document.find(query)
        .populate('linked_transaction', 'description amount type')
        .sort({ uploaded_at: -1 })
        .skip(skip)
        .limit(pageSize)
        .lean(),
      Document.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / pageSize);

    res.json({
      success: true,
      data: documents,
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

const createDocument = async (req, res, next) => {
  try {
    const { name, originalName, type, fileType, mimeType, size, url, thumbnailUrl, linkedTransaction, notes, date } = req.body;

    // Create document record with ImageKit URL
    const documentData = {
      user_id: req.user.id,
      name: name || originalName,
      original_name: originalName,
      type: type || 'other',
      file_type: fileType || getFileType(mimeType),
      mime_type: mimeType,
      size: size || 0,
      url: url,
      thumbnail_url: thumbnailUrl || (fileType === 'image' ? url : null),
      uploaded_at: date || new Date(),
      linked_transaction: linkedTransaction || null,
      notes: notes || null
    };

    const document = await Document.create(documentData);

    res.status(201).json({
      success: true,
      data: document,
      message: 'Document created successfully'
    });
  } catch (error) {
    next(error);
  }
};

const updateDocument = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const document = await Document.findOneAndUpdate(
      { _id: id, user_id: req.user.id },
      updateData,
      { new: true, runValidators: true }
    );

    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document not found'
      });
    }

    res.json({
      success: true,
      data: document,
      message: 'Document updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

const deleteDocument = async (req, res, next) => {
  try {
    const { id } = req.params;

    const document = await Document.findOneAndDelete({
      _id: id, 
      user_id: req.user.id
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document not found'
      });
    }

    // Note: With ImageKit, you might want to delete the file from ImageKit as well
    // This would require calling ImageKit's delete API
    // For now, we'll just delete the database record
    
    res.json({
      success: true,
      message: 'Document deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

const downloadDocument = async (req, res, next) => {
  try {
    const { id } = req.params;

    const document = await Document.findOne({
      _id: id, 
      user_id: req.user.id
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document not found'
      });
    }

    // With ImageKit, we redirect to the ImageKit URL
    res.redirect(document.url);
  } catch (error) {
    next(error);
  }
};

const getDocumentsByType = async (req, res, next) => {
  try {
    const { type } = req.params;

    const documents = await Document.find({
      user_id: req.user.id,
      type: type
    }).sort({ uploaded_at: -1 });

    res.json({
      success: true,
      data: documents
    });
  } catch (error) {
    next(error);
  }
};

const getDocumentsByTransaction = async (req, res, next) => {
  try {
    const { transactionId } = req.params;

    const documents = await Document.find({
      user_id: req.user.id,
      linked_transaction: transactionId
    }).sort({ uploaded_at: -1 });

    res.json({
      success: true,
      data: documents
    });
  } catch (error) {
    next(error);
  }
};

const getUserStorageUsage = async (req, res, next) => {
  try {
    const documents = await Document.find({
      user_id: req.user.id
    }).select('file_type size');

    const usage = {
      totalSize: 0,
      documentCount: documents.length,
      typeBreakdown: {}
    };

    documents.forEach(doc => {
      usage.totalSize += parseInt(doc.size);

      if (!usage.typeBreakdown[doc.file_type]) {
        usage.typeBreakdown[doc.file_type] = { count: 0, size: 0 };
      }
      usage.typeBreakdown[doc.file_type].count++;
      usage.typeBreakdown[doc.file_type].size += parseInt(doc.size);
    });

    res.json({
      success: true,
      data: usage
    });
  } catch (error) {
    next(error);
  }
};

// Helper function to determine file type
const getFileType = (mimeType) => {
  if (mimeType.startsWith('image/')) {
    return 'image';
  } else if (mimeType === 'application/pdf') {
    return 'pdf';
  } else {
    return 'document';
  }
};

// Validation rules for ImageKit integration
const createDocumentValidation = [
  body('name').optional().isString(),
  body('originalName').notEmpty().withMessage('Original name is required'),
  body('type').optional().isIn(['receipt', 'invoice', 'proof', 'other']),
  body('fileType').optional().isIn(['pdf', 'image', 'document']),
  body('mimeType').notEmpty().withMessage('MIME type is required'),
  body('size').optional().isInt({ min: 0 }),
  body('url').notEmpty().withMessage('ImageKit URL is required'),
  body('thumbnailUrl').optional().isString(),
  body('linkedTransaction').optional().isMongoId(),
  body('notes').optional().isString(),
  body('date').optional().isISO8601()
];

const updateDocumentValidation = [
  body('name').optional().isString(),
  body('type').optional().isIn(['receipt', 'invoice', 'proof', 'other']),
  body('linkedTransaction').optional().isMongoId(),
  body('notes').optional().isString()
];

const getDocumentsValidation = [
  query('search').optional().isString(),
  query('type').optional().isIn(['receipt', 'invoice', 'proof', 'other']),
  query('fileType').optional().isIn(['pdf', 'image', 'document']),
  query('linkedTransaction').optional().isBoolean(),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601()
];

module.exports = {
  getUserDocuments,
  createDocument,
  updateDocument,
  deleteDocument,
  downloadDocument,
  getDocumentsByType,
  getDocumentsByTransaction,
  getUserStorageUsage,
  createDocumentValidation,
  updateDocumentValidation,
  getDocumentsValidation
};
