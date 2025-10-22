const express = require('express');
const {
  getUserTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getTransactionSummary,
  getRecentTransactions,
  createTransactionValidation,
  updateTransactionValidation,
  getTransactionsValidation
} = require('../controllers/transactionController');
const { authenticateToken } = require('../middleware/auth');
const { validateRequest, validatePagination } = require('../middleware/validation');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     TransactionRequest:
 *       type: object
 *       required:
 *         - type
 *         - amount
 *         - description
 *         - category
 *         - date
 *       properties:
 *         type:
 *           type: string
 *           enum: [income, expense]
 *           example: income
 *         description:
 *           type: string
 *           example: Freelance project payment
 *         amount:
 *           type: string
 *           example: "50000"
 *         date:
 *           type: string
 *           format: date
 *           example: "2025-10-22"
 *         category:
 *           type: string
 *           example: freelance
 *         paymentMethod:
 *           type: string
 *           example: Bank Transfer
 *         notes:
 *           type: string
 *           example: Additional notes
 *         taxDeductible:
 *           type: boolean
 *           example: false
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *           example: ["january", "freelance"]
 *         attachments:
 *           type: array
 *           items:
 *             type: string
 *           example: ["https://example.com/receipt.pdf"]
 *     TransactionUpdateRequest:
 *       type: object
 *       properties:
 *         type:
 *           type: string
 *           enum: [income, expense]
 *         description:
 *           type: string
 *         amount:
 *           type: string
 *         date:
 *           type: string
 *           format: date
 *         category:
 *           type: string
 *         paymentMethod:
 *           type: string
 *         notes:
 *           type: string
 *         taxDeductible:
 *           type: boolean
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *         attachments:
 *           type: array
 *           items:
 *             type: string
 *     TransactionResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           $ref: '#/components/schemas/Transaction'
 *         message:
 *           type: string
 *           example: Transaction created successfully
 *     TransactionSummary:
 *       type: object
 *       properties:
 *         totalIncome:
 *           type: number
 *           example: 150000
 *         totalExpense:
 *           type: number
 *           example: 75000
 *         netIncome:
 *           type: number
 *           example: 75000
 *         transactionCount:
 *           type: number
 *           example: 25
 */

// All routes require authentication
router.use(authenticateToken);

/**
 * @swagger
 * /transactions:
 *   get:
 *     summary: Get user transactions with pagination
 *     tags: [Transactions]
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
 *         description: Number of transactions per page
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [income, expense]
 *         description: Filter by transaction type
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date filter (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date filter (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Transactions retrieved successfully
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
 *                     transactions:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Transaction'
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
 *                           example: 25
 *                         pages:
 *                           type: integer
 *                           example: 3
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', validatePagination, getTransactionsValidation, validateRequest, getUserTransactions);

/**
 * @swagger
 * /transactions:
 *   post:
 *     summary: Create a new transaction
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TransactionRequest'
 *     responses:
 *       201:
 *         description: Transaction created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TransactionResponse'
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
router.post('/', createTransactionValidation, validateRequest, createTransaction);

/**
 * @swagger
 * /transactions/summary:
 *   get:
 *     summary: Get transaction summary
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Transaction summary retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/TransactionSummary'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/summary', getTransactionSummary);

/**
 * @swagger
 * /transactions/recent:
 *   get:
 *     summary: Get recent transactions
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 5
 *         description: Number of recent transactions to retrieve
 *     responses:
 *       200:
 *         description: Recent transactions retrieved successfully
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
 *                     $ref: '#/components/schemas/Transaction'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/recent', getRecentTransactions);

/**
 * @swagger
 * /transactions/{id}:
 *   put:
 *     summary: Update a transaction
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Transaction ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TransactionUpdateRequest'
 *     responses:
 *       200:
 *         description: Transaction updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TransactionResponse'
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
 *         description: Transaction not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   delete:
 *     summary: Delete a transaction
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Transaction ID
 *     responses:
 *       200:
 *         description: Transaction deleted successfully
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
 *                   example: Transaction deleted successfully
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Transaction not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/:id', updateTransactionValidation, validateRequest, updateTransaction);
router.delete('/:id', deleteTransaction);

module.exports = router;
