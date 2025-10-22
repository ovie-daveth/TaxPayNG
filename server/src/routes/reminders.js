const express = require('express');
const {
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
} = require('../controllers/reminderController');
const { authenticateToken } = require('../middleware/auth');
const { validateRequest, validatePagination } = require('../middleware/validation');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     ReminderRequest:
 *       type: object
 *       required:
 *         - title
 *         - due_date
 *       properties:
 *         title:
 *           type: string
 *           example: Submit monthly tax return
 *         description:
 *           type: string
 *           example: Complete and submit January 2024 tax return
 *         due_date:
 *           type: string
 *           format: date-time
 *           example: "2024-02-15T23:59:59.000Z"
 *         priority:
 *           type: string
 *           enum: [low, medium, high]
 *           example: high
 *         type:
 *           type: string
 *           example: tax_filing
 *     ReminderUpdateRequest:
 *       type: object
 *       properties:
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         due_date:
 *           type: string
 *           format: date-time
 *         priority:
 *           type: string
 *           enum: [low, medium, high]
 *         type:
 *           type: string
 *     ReminderResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           $ref: '#/components/schemas/Reminder'
 *         message:
 *           type: string
 *           example: Reminder created successfully
 *     ReminderStats:
 *       type: object
 *       properties:
 *         total:
 *           type: number
 *           example: 15
 *         completed:
 *           type: number
 *           example: 8
 *         pending:
 *           type: number
 *           example: 5
 *         overdue:
 *           type: number
 *           example: 2
 *         completionRate:
 *           type: number
 *           example: 53.3
 */

// All routes require authentication
router.use(authenticateToken);

/**
 * @swagger
 * /reminders:
 *   get:
 *     summary: Get user reminders with pagination
 *     tags: [Reminders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of reminders per page
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [low, medium, high]
 *         description: Filter by priority
 *       - in: query
 *         name: is_completed
 *         schema:
 *           type: boolean
 *         description: Filter by completion status
 *     responses:
 *       200:
 *         description: Reminders retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     reminders:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Reminder'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                           example: 1
 *                         limit:
 *                           type: integer
 *                           example: 10
 *                         total:
 *                           type: integer
 *                           example: 15
 *                         pages:
 *                           type: integer
 *                           example: 2
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   post:
 *     summary: Create a new reminder
 *     tags: [Reminders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ReminderRequest'
 *     responses:
 *       201:
 *         description: Reminder created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ReminderResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', validatePagination, getRemindersValidation, validateRequest, getUserReminders);
router.post('/', createReminderValidation, validateRequest, createReminder);

/**
 * @swagger
 * /reminders/upcoming:
 *   get:
 *     summary: Get upcoming reminders
 *     tags: [Reminders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Upcoming reminders retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Reminder'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/upcoming', getUpcomingReminders);

/**
 * @swagger
 * /reminders/overdue:
 *   get:
 *     summary: Get overdue reminders
 *     tags: [Reminders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Overdue reminders retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Reminder'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/overdue', getOverdueReminders);

/**
 * @swagger
 * /reminders/stats:
 *   get:
 *     summary: Get reminder statistics
 *     tags: [Reminders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Reminder statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ReminderStats'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/stats', getReminderStats);

/**
 * @swagger
 * /reminders/type/{type}:
 *   get:
 *     summary: Get reminders by type
 *     tags: [Reminders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *         description: Reminder type
 *     responses:
 *       200:
 *         description: Reminders retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Reminder'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/type/:type', getRemindersByType);

/**
 * @swagger
 * /reminders/priority/{priority}:
 *   get:
 *     summary: Get reminders by priority
 *     tags: [Reminders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: priority
 *         required: true
 *         schema:
 *           type: string
 *           enum: [low, medium, high]
 *         description: Reminder priority
 *     responses:
 *       200:
 *         description: Reminders retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Reminder'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/priority/:priority', getRemindersByPriority);

/**
 * @swagger
 * /reminders/{id}:
 *   put:
 *     summary: Update a reminder
 *     tags: [Reminders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Reminder ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ReminderUpdateRequest'
 *     responses:
 *       200:
 *         description: Reminder updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ReminderResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Reminder not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   delete:
 *     summary: Delete a reminder
 *     tags: [Reminders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Reminder ID
 *     responses:
 *       200:
 *         description: Reminder deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Reminder deleted successfully
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Reminder not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/:id', updateReminderValidation, validateRequest, updateReminder);
router.delete('/:id', deleteReminder);

/**
 * @swagger
 * /reminders/{id}/complete:
 *   put:
 *     summary: Mark reminder as completed
 *     tags: [Reminders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Reminder ID
 *     responses:
 *       200:
 *         description: Reminder marked as completed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ReminderResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Reminder not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/:id/complete', markCompleted);

/**
 * @swagger
 * /reminders/{id}/incomplete:
 *   put:
 *     summary: Mark reminder as incomplete
 *     tags: [Reminders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Reminder ID
 *     responses:
 *       200:
 *         description: Reminder marked as incomplete
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ReminderResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Reminder not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/:id/incomplete', markIncomplete);

module.exports = router;
