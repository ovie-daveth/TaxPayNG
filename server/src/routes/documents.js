const express = require('express');
const {
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
} = require('../controllers/documentController');
const { authenticateToken } = require('../middleware/auth');
const { validateRequest, validatePagination } = require('../middleware/validation');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     DocumentRequest:
 *       type: object
 *       required:
 *         - name
 *         - type
 *         - file_url
 *       properties:
 *         name:
 *           type: string
 *           example: Receipt_January_2024.pdf
 *         type:
 *           type: string
 *           enum: [receipt, invoice, tax_document, other]
 *           example: receipt
 *         file_url:
 *           type: string
 *           format: uri
 *           example: https://ik.imagekit.io/your-imagekit-id/receipt_123.pdf
 *         file_size:
 *           type: number
 *           example: 2048576
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *           example: ["january", "expense", "office"]
 *         transaction_id:
 *           type: string
 *           example: 507f1f77bcf86cd799439011
 *     DocumentUpdateRequest:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *         type:
 *           type: string
 *           enum: [receipt, invoice, tax_document, other]
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *         transaction_id:
 *           type: string
 *     DocumentResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           $ref: '#/components/schemas/Document'
 *         message:
 *           type: string
 *           example: Document created successfully
 *     StorageUsage:
 *       type: object
 *       properties:
 *         totalFiles:
 *           type: number
 *           example: 25
 *         totalSize:
 *           type: number
 *           example: 52428800
 *         sizeLimit:
 *           type: number
 *           example: 1073741824
 *         usagePercentage:
 *           type: number
 *           example: 4.9
 */

// All routes require authentication
router.use(authenticateToken);

/**
 * @swagger
 * /documents:
 *   get:
 *     summary: Get user documents with pagination
 *     tags: [Documents]
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
 *         description: Number of documents per page
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [receipt, invoice, tax_document, other]
 *         description: Filter by document type
 *       - in: query
 *         name: tags
 *         schema:
 *           type: string
 *         description: Filter by tags (comma-separated)
 *     responses:
 *       200:
 *         description: Documents retrieved successfully
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
 *                     documents:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Document'
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
 *   post:
 *     summary: Create a new document
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DocumentRequest'
 *     responses:
 *       201:
 *         description: Document created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DocumentResponse'
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
router.get('/', validatePagination, getDocumentsValidation, validateRequest, getUserDocuments);
router.post('/', createDocumentValidation, validateRequest, createDocument);

/**
 * @swagger
 * /documents/storage-usage:
 *   get:
 *     summary: Get user storage usage
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Storage usage retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/StorageUsage'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/storage-usage', getUserStorageUsage);

/**
 * @swagger
 * /documents/type/{type}:
 *   get:
 *     summary: Get documents by type
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [receipt, invoice, tax_document, other]
 *         description: Document type
 *     responses:
 *       200:
 *         description: Documents retrieved successfully
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
 *                     $ref: '#/components/schemas/Document'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/type/:type', getDocumentsByType);

/**
 * @swagger
 * /documents/transaction/{transactionId}:
 *   get:
 *     summary: Get documents by transaction
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: transactionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Transaction ID
 *     responses:
 *       200:
 *         description: Documents retrieved successfully
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
 *                     $ref: '#/components/schemas/Document'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/transaction/:transactionId', getDocumentsByTransaction);

/**
 * @swagger
 * /documents/{id}/download:
 *   get:
 *     summary: Download document
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Document ID
 *     responses:
 *       200:
 *         description: Document download initiated
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Document not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id/download', downloadDocument);

/**
 * @swagger
 * /documents/{id}:
 *   put:
 *     summary: Update a document
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Document ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DocumentUpdateRequest'
 *     responses:
 *       200:
 *         description: Document updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DocumentResponse'
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
 *         description: Document not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   delete:
 *     summary: Delete a document
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Document ID
 *     responses:
 *       200:
 *         description: Document deleted successfully
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
 *                   example: Document deleted successfully
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Document not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/:id', updateDocumentValidation, validateRequest, updateDocument);
router.delete('/:id', deleteDocument);

module.exports = router;
