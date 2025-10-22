const { Reminder } = require('../models');
const { body, query } = require('express-validator');

const getUserReminders = async (req, res, next) => {
  try {
    const { page, pageSize } = req.pagination;
    const { showCompleted } = req.query;

    // Build MongoDB query
    const query = { user_id: req.user.id };
    
    if (showCompleted !== 'true') {
      query.is_completed = false;
    }

    const skip = (page - 1) * pageSize;

    const [reminders, total] = await Promise.all([
      Reminder.find(query)
        .sort({ due_date: 1 })
        .skip(skip)
        .limit(pageSize)
        .lean(),
      Reminder.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / pageSize);

    res.json({
      success: true,
      data: reminders,
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

const createReminder = async (req, res, next) => {
  try {
    const reminderData = {
      ...req.body,
      user_id: req.user.id,
      is_completed: false
    };

    const reminder = await Reminder.create(reminderData);

    res.status(201).json({
      success: true,
      data: reminder,
      message: 'Reminder created successfully'
    });
  } catch (error) {
    next(error);
  }
};

const updateReminder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const reminder = await Reminder.findOneAndUpdate(
      { _id: id, user_id: req.user.id },
      updateData,
      { new: true, runValidators: true }
    );

    if (!reminder) {
      return res.status(404).json({
        success: false,
        error: 'Reminder not found'
      });
    }

    res.json({
      success: true,
      data: reminder,
      message: 'Reminder updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

const markCompleted = async (req, res, next) => {
  try {
    const { id } = req.params;

    const reminder = await Reminder.findOneAndUpdate(
      { _id: id, user_id: req.user.id },
      {
        is_completed: true,
        completed_at: new Date()
      },
      { new: true }
    );

    if (!reminder) {
      return res.status(404).json({
        success: false,
        error: 'Reminder not found'
      });
    }

    res.json({
      success: true,
      data: reminder,
      message: 'Reminder marked as completed'
    });
  } catch (error) {
    next(error);
  }
};

const markIncomplete = async (req, res, next) => {
  try {
    const { id } = req.params;

    const reminder = await Reminder.findOneAndUpdate(
      { _id: id, user_id: req.user.id },
      {
        is_completed: false,
        completed_at: null
      },
      { new: true }
    );

    if (!reminder) {
      return res.status(404).json({
        success: false,
        error: 'Reminder not found'
      });
    }

    res.json({
      success: true,
      data: reminder,
      message: 'Reminder marked as incomplete'
    });
  } catch (error) {
    next(error);
  }
};

const deleteReminder = async (req, res, next) => {
  try {
    const { id } = req.params;

    const reminder = await Reminder.findOneAndDelete({
      _id: id, 
      user_id: req.user.id
    });

    if (!reminder) {
      return res.status(404).json({
        success: false,
        error: 'Reminder not found'
      });
    }

    res.json({
      success: true,
      message: 'Reminder deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

const getUpcomingReminders = async (req, res, next) => {
  try {
    const daysAhead = parseInt(req.query.days) || 30;
    const now = new Date();
    const futureDate = new Date(now.getTime() + (daysAhead * 24 * 60 * 60 * 1000));

    const reminders = await Reminder.find({
      user_id: req.user.id,
      is_completed: false,
      due_date: {
        $gte: now,
        $lte: futureDate
      }
    }).sort({ due_date: 1 });

    res.json({
      success: true,
      data: reminders
    });
  } catch (error) {
    next(error);
  }
};

const getOverdueReminders = async (req, res, next) => {
  try {
    const now = new Date();

    const reminders = await Reminder.find({
      user_id: req.user.id,
      is_completed: false,
      due_date: {
        $lt: now
      }
    }).sort({ due_date: 1 });

    res.json({
      success: true,
      data: reminders
    });
  } catch (error) {
    next(error);
  }
};

const getRemindersByType = async (req, res, next) => {
  try {
    const { type } = req.params;

    const reminders = await Reminder.find({
      user_id: req.user.id,
      type: type
    }).sort({ due_date: 1 });

    res.json({
      success: true,
      data: reminders
    });
  } catch (error) {
    next(error);
  }
};

const getRemindersByPriority = async (req, res, next) => {
  try {
    const { priority } = req.params;

    const reminders = await Reminder.find({
      user_id: req.user.id,
      priority: priority,
      is_completed: false
    }).sort({ due_date: 1 });

    res.json({
      success: true,
      data: reminders
    });
  } catch (error) {
    next(error);
  }
};

const getReminderStats = async (req, res, next) => {
  try {
    const allReminders = await Reminder.find({
      user_id: req.user.id
    });

    const now = new Date();
    const stats = {
      total: allReminders.length,
      completed: 0,
      pending: 0,
      overdue: 0,
      upcoming: 0,
      byType: {},
      byPriority: {}
    };

    allReminders.forEach(reminder => {
      if (reminder.is_completed) {
        stats.completed++;
      } else {
        stats.pending++;
        
        const dueDate = new Date(reminder.due_date);
        if (dueDate < now) {
          stats.overdue++;
        } else {
          stats.upcoming++;
        }
      }

      // Count by type
      if (!stats.byType[reminder.type]) {
        stats.byType[reminder.type] = 0;
      }
      stats.byType[reminder.type]++;

      // Count by priority
      if (!stats.byPriority[reminder.priority]) {
        stats.byPriority[reminder.priority] = 0;
      }
      stats.byPriority[reminder.priority]++;
    });

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

// Validation rules
const createReminderValidation = [
  body('title').notEmpty().withMessage('Title is required'),
  body('type').isIn(['tax_deadline', 'payment_due', 'document_submission', 'other']).withMessage('Invalid reminder type'),
  body('dueDate').isISO8601().withMessage('Due date must be a valid date'),
  body('priority').optional().isIn(['low', 'medium', 'high']).withMessage('Invalid priority'),
  body('description').optional().isString(),
  body('recurring').optional().isObject()
];

const updateReminderValidation = [
  body('title').optional().notEmpty().withMessage('Title cannot be empty'),
  body('type').optional().isIn(['tax_deadline', 'payment_due', 'document_submission', 'other']).withMessage('Invalid reminder type'),
  body('dueDate').optional().isISO8601().withMessage('Due date must be a valid date'),
  body('priority').optional().isIn(['low', 'medium', 'high']).withMessage('Invalid priority'),
  body('description').optional().isString(),
  body('recurring').optional().isObject()
];

const getRemindersValidation = [
  query('showCompleted').optional().isBoolean(),
  query('days').optional().isInt({ min: 1, max: 365 })
];

module.exports = {
  getUserReminders,
  createReminder,
  updateReminder,
  markCompleted,
  markIncomplete,
  deleteReminder,
  getUpcomingReminders,
  getOverdueReminders,
  getRemindersByType,
  getRemindersByPriority,
  getReminderStats,
  createReminderValidation,
  updateReminderValidation,
  getRemindersValidation
};
