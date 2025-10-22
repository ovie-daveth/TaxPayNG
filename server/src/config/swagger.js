const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'TaxPayNG API',
      version: '1.0.0',
      description: 'API documentation for TaxPayNG - Nigeria Tax Management System',
      contact: {
        name: 'TaxPayNG Team',
        email: 'support@taxpayng.com'
      }
    },
    servers: [
      {
        url: process.env.NODE_ENV === 'production' 
          ? 'https://your-production-url.com/api'
          : `http://localhost:${process.env.PORT || 3001}/api`,
        description: process.env.NODE_ENV === 'production' ? 'Production server' : 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter JWT token'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'User ID'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address'
            },
            first_name: {
              type: 'string',
              description: 'User first name'
            },
            last_name: {
              type: 'string',
              description: 'User last name'
            },
            phone: {
              type: 'string',
              description: 'User phone number'
            },
            business_type: {
              type: 'string',
              enum: ['freelancer', 'sme', 'individual'],
              description: 'Type of business'
            },
            tax_id: {
              type: 'string',
              description: 'Tax identification number'
            },
            email_verified: {
              type: 'boolean',
              description: 'Email verification status'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Account creation date'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update date'
            }
          }
        },
        Transaction: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'Transaction ID'
            },
            user_id: {
              type: 'string',
              description: 'User ID'
            },
            type: {
              type: 'string',
              enum: ['income', 'expense'],
              description: 'Transaction type'
            },
            description: {
              type: 'string',
              description: 'Transaction description'
            },
            amount: {
              type: 'string',
              description: 'Transaction amount'
            },
            date: {
              type: 'string',
              format: 'date',
              description: 'Transaction date'
            },
            category: {
              type: 'string',
              description: 'Transaction category'
            },
            paymentMethod: {
              type: 'string',
              description: 'Payment method used'
            },
            notes: {
              type: 'string',
              description: 'Additional notes'
            },
            taxDeductible: {
              type: 'boolean',
              description: 'Whether the transaction is tax deductible'
            },
            tags: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Transaction tags'
            },
            attachments: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'File attachments'
            },
            document_id: {
              type: 'string',
              description: 'Linked document ID'
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        Document: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'Document ID'
            },
            user_id: {
              type: 'string',
              description: 'User ID'
            },
            name: {
              type: 'string',
              description: 'Document name'
            },
            type: {
              type: 'string',
              enum: ['receipt', 'invoice', 'tax_document', 'other'],
              description: 'Document type'
            },
            file_url: {
              type: 'string',
              format: 'uri',
              description: 'Document file URL'
            },
            file_size: {
              type: 'number',
              description: 'File size in bytes'
            },
            tags: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Document tags'
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        Reminder: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'Reminder ID'
            },
            user_id: {
              type: 'string',
              description: 'User ID'
            },
            title: {
              type: 'string',
              description: 'Reminder title'
            },
            description: {
              type: 'string',
              description: 'Reminder description'
            },
            due_date: {
              type: 'string',
              format: 'date-time',
              description: 'Reminder due date'
            },
            priority: {
              type: 'string',
              enum: ['low', 'medium', 'high'],
              description: 'Reminder priority'
            },
            is_completed: {
              type: 'boolean',
              description: 'Completion status'
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            message: {
              type: 'string',
              description: 'Error message'
            },
            errors: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Validation errors'
            }
          }
        },
        Success: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            message: {
              type: 'string',
              description: 'Success message'
            },
            data: {
              type: 'object',
              description: 'Response data'
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: [
    './src/routes/*.js',
    './src/controllers/*.js'
  ]
};

const specs = swaggerJsdoc(options);

module.exports = specs;
