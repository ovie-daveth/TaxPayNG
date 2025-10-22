const express = require('express');
const {
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
} = require('../controllers/taxController');
const { authenticateToken } = require('../middleware/auth');
const { validateRequest, validatePagination } = require('../middleware/validation');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     TaxCalculationRequest:
 *       type: object
 *       required:
 *         - business_type
 *         - annual_income
 *         - period
 *       properties:
 *         business_type:
 *           type: string
 *           enum: [freelancer, sme, individual]
 *           example: freelancer
 *         annual_income:
 *           type: number
 *           example: 5000000
 *         period:
 *           type: string
 *           example: "2024"
 *         deductions:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 example: "business_expense"
 *               amount:
 *                 type: number
 *                 example: 500000
 *               description:
 *                 type: string
 *                 example: "Office rent and utilities"
 *         allowances:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 example: "personal_allowance"
 *               amount:
 *                 type: number
 *                 example: 300000
 *     TaxCalculationUpdateRequest:
 *       type: object
 *       properties:
 *         annual_income:
 *           type: number
 *         period:
 *           type: string
 *         deductions:
 *           type: array
 *           items:
 *             type: object
 *         allowances:
 *           type: array
 *           items:
 *             type: object
 *     TaxCalculationResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           $ref: '#/components/schemas/TaxCalculation'
 *         message:
 *           type: string
 *           example: Tax calculation created successfully
 *     TaxCalculationStats:
 *       type: object
 *       properties:
 *         totalCalculations:
 *           type: number
 *           example: 12
 *         averageTaxRate:
 *           type: number
 *           example: 15.5
 *         totalTaxPaid:
 *           type: number
 *           example: 2500000
 *         averageAnnualIncome:
 *           type: number
 *           example: 4500000
 */

// All routes require authentication
router.use(authenticateToken);

/**
 * @swagger
 * /tax:
 *   get:
 *     summary: Get user tax calculations with pagination
 *     tags: [Tax Calculations]
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
 *         description: Number of calculations per page
 *     responses:
 *       200:
 *         description: Tax calculations retrieved successfully
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
 *                     calculations:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/TaxCalculation'
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
 *                           example: 12
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
 *     summary: Create a new tax calculation
 *     tags: [Tax Calculations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TaxCalculationRequest'
 *     responses:
 *       201:
 *         description: Tax calculation created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TaxCalculationResponse'
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
router.get('/', validatePagination, validateRequest, getUserCalculations);
router.post('/', createCalculationValidation, validateRequest, createCalculation);

/**
 * @swagger
 * /tax/latest:
 *   get:
 *     summary: Get latest tax calculation
 *     tags: [Tax Calculations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Latest tax calculation retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/TaxCalculation'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: No calculations found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/latest', getLatestCalculation);

/**
 * @swagger
 * /tax/stats:
 *   get:
 *     summary: Get tax calculation statistics
 *     tags: [Tax Calculations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Tax calculation statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/TaxCalculationStats'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/stats', getCalculationStats);

/**
 * @swagger
 * /tax/business-type/{businessType}:
 *   get:
 *     summary: Get calculations by business type
 *     tags: [Tax Calculations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: businessType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [freelancer, sme, individual]
 *         description: Business type
 *     responses:
 *       200:
 *         description: Calculations retrieved successfully
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
 *                     $ref: '#/components/schemas/TaxCalculation'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/business-type/:businessType', getCalculationsByBusinessType);

/**
 * @swagger
 * /tax/period/{period}:
 *   get:
 *     summary: Get calculations by period
 *     tags: [Tax Calculations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: period
 *         required: true
 *         schema:
 *           type: string
 *         description: Tax period (e.g., "2024")
 *     responses:
 *       200:
 *         description: Calculations retrieved successfully
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
 *                     $ref: '#/components/schemas/TaxCalculation'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/period/:period', getCalculationsByPeriod);

/**
 * @swagger
 * /tax/compare/{calculationId1}/{calculationId2}:
 *   get:
 *     summary: Compare two tax calculations
 *     tags: [Tax Calculations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: calculationId1
 *         required: true
 *         schema:
 *           type: string
 *         description: First calculation ID
 *       - in: path
 *         name: calculationId2
 *         required: true
 *         schema:
 *           type: string
 *         description: Second calculation ID
 *     responses:
 *       200:
 *         description: Calculations compared successfully
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
 *                     calculation1:
 *                       $ref: '#/components/schemas/TaxCalculation'
 *                     calculation2:
 *                       $ref: '#/components/schemas/TaxCalculation'
 *                     comparison:
 *                       type: object
 *                       properties:
 *                         difference:
 *                           type: number
 *                           example: 150000
 *                         percentageChange:
 *                           type: number
 *                           example: 12.5
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: One or both calculations not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/compare/:calculationId1/:calculationId2', compareCalculations);

/**
 * @swagger
 * /tax/{id}:
 *   put:
 *     summary: Update a tax calculation
 *     tags: [Tax Calculations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Tax calculation ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TaxCalculationUpdateRequest'
 *     responses:
 *       200:
 *         description: Tax calculation updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TaxCalculationResponse'
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
 *         description: Tax calculation not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   delete:
 *     summary: Delete a tax calculation
 *     tags: [Tax Calculations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Tax calculation ID
 *     responses:
 *       200:
 *         description: Tax calculation deleted successfully
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
 *                   example: Tax calculation deleted successfully
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Tax calculation not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/:id', updateCalculationValidation, validateRequest, updateCalculation);
router.delete('/:id', deleteCalculation);

module.exports = router;
