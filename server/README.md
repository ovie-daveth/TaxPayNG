# TaxPayNG Backend API

A Node.js/Express backend API for the TaxPayNG application, providing comprehensive tax management, transaction tracking, document management, and reminder functionality.

## Features

- **Authentication & Authorization**: JWT-based authentication with secure password hashing
- **User Management**: User profiles, preferences, and account management
- **Transaction Management**: Income and expense tracking with categorization
- **Document Management**: File upload, storage, and organization
- **Reminder System**: Tax deadlines, payment reminders, and task management
- **Tax Calculations**: Nigerian tax calculation engine with multiple business types
- **File Upload**: Secure file handling with validation and storage
- **Rate Limiting**: API protection against abuse
- **Input Validation**: Comprehensive request validation
- **Error Handling**: Structured error responses

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL with Sequelize ORM
- **Authentication**: JWT (JSON Web Tokens)
- **File Upload**: Multer
- **Validation**: Express Validator
- **Security**: Helmet, CORS, Rate Limiting
- **Logging**: Morgan

## Prerequisites

- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd server
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   NODE_ENV=development
   PORT=3001
   FRONTEND_URL=http://localhost:3000
   
   # Database Configuration
   DATABASE_URL=postgresql://username:password@localhost:5432/taxpay_db
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=taxpay_db
   DB_USER=username
   DB_PASSWORD=password
   
   # JWT Configuration
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   JWT_EXPIRES_IN=7d
   
   # File Upload Configuration
   MAX_FILE_SIZE=10485760
   UPLOAD_PATH=./uploads
   ```

4. **Set up PostgreSQL database**
   ```bash
   # Create database
   createdb taxpay_db
   
   # Or using psql
   psql -U postgres
   CREATE DATABASE taxpay_db;
   ```

5. **Initialize database tables**
   ```bash
   npm run init-db
   ```

6. **Start the server**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
   ```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/verify` - Verify JWT token
- `GET /api/auth/profile` - Get user profile

### Users
- `PUT /api/users/profile` - Update user profile
- `PUT /api/users/change-password` - Change password
- `DELETE /api/users/account` - Delete account

### Transactions
- `GET /api/transactions` - Get user transactions (with pagination and filters)
- `POST /api/transactions` - Create new transaction
- `PUT /api/transactions/:id` - Update transaction
- `DELETE /api/transactions/:id` - Delete transaction
- `GET /api/transactions/summary` - Get transaction summary
- `GET /api/transactions/recent` - Get recent transactions

### Documents
- `GET /api/documents` - Get user documents (with pagination and filters)
- `POST /api/documents/upload` - Upload document
- `PUT /api/documents/:id` - Update document metadata
- `DELETE /api/documents/:id` - Delete document
- `GET /api/documents/:id/download` - Download document
- `GET /api/documents/storage-usage` - Get storage usage statistics
- `GET /api/documents/type/:type` - Get documents by type
- `GET /api/documents/transaction/:transactionId` - Get documents by transaction

### Reminders
- `GET /api/reminders` - Get user reminders (with pagination)
- `POST /api/reminders` - Create new reminder
- `PUT /api/reminders/:id` - Update reminder
- `PUT /api/reminders/:id/complete` - Mark reminder as completed
- `PUT /api/reminders/:id/incomplete` - Mark reminder as incomplete
- `DELETE /api/reminders/:id` - Delete reminder
- `GET /api/reminders/upcoming` - Get upcoming reminders
- `GET /api/reminders/overdue` - Get overdue reminders
- `GET /api/reminders/stats` - Get reminder statistics
- `GET /api/reminders/type/:type` - Get reminders by type
- `GET /api/reminders/priority/:priority` - Get reminders by priority

### Tax Calculations
- `GET /api/tax` - Get user tax calculations (with pagination)
- `POST /api/tax` - Create new tax calculation
- `PUT /api/tax/:id` - Update tax calculation
- `DELETE /api/tax/:id` - Delete tax calculation
- `GET /api/tax/latest` - Get latest calculation
- `GET /api/tax/stats` - Get calculation statistics
- `GET /api/tax/business-type/:businessType` - Get calculations by business type
- `GET /api/tax/period/:period` - Get calculations by period
- `GET /api/tax/compare/:id1/:id2` - Compare two calculations

## Database Schema

### Users Table
- `id` (UUID, Primary Key)
- `email` (String, Unique)
- `password_hash` (String)
- `first_name` (String)
- `last_name` (String)
- `phone` (String, Optional)
- `business_type` (Enum: freelancer, sme, individual)
- `tax_id` (String, Optional)
- `preferences` (JSONB)
- `address` (JSONB, Optional)
- `email_verified` (Boolean)
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

### Transactions Table
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key)
- `type` (Enum: income, expense)
- `category` (String)
- `amount` (Decimal)
- `description` (Text)
- `date` (Date)
- `payment_method` (String, Optional)
- `tax_deductible` (Boolean)
- `notes` (Text, Optional)
- `tags` (Array of Strings)
- `attachments` (Array of Strings)
- `receipt_url` (String, Optional)
- `document_id` (UUID, Optional)
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

### Documents Table
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key)
- `name` (String)
- `original_name` (String)
- `type` (Enum: receipt, invoice, proof, other)
- `file_type` (Enum: pdf, image, document)
- `mime_type` (String)
- `size` (BigInt)
- `url` (Text)
- `thumbnail_url` (Text, Optional)
- `uploaded_at` (Timestamp)
- `linked_transaction` (UUID, Optional)
- `notes` (Text, Optional)
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

### Reminders Table
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key)
- `title` (String)
- `description` (Text, Optional)
- `type` (Enum: tax_deadline, payment_due, document_submission, other)
- `due_date` (Timestamp)
- `priority` (Enum: low, medium, high)
- `is_completed` (Boolean)
- `completed_at` (Timestamp, Optional)
- `recurring` (JSONB, Optional)
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

### Tax Calculations Table
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key)
- `business_type` (String)
- `period` (Enum: monthly, quarterly, yearly)
- `income` (Decimal)
- `rent_paid` (Decimal)
- `pension_contribution` (Decimal)
- `health_insurance` (Decimal)
- `life_insurance` (Decimal)
- `charitable_donations` (Decimal)
- `business_expenses` (Decimal)
- `dependents` (Integer)
- `result` (JSONB)
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt with salt rounds
- **Rate Limiting**: Prevents API abuse
- **CORS Protection**: Configurable cross-origin requests
- **Input Validation**: Comprehensive request validation
- **SQL Injection Protection**: Sequelize ORM with parameterized queries
- **File Upload Security**: File type and size validation
- **Error Handling**: No sensitive information in error responses

## Development

### Scripts
- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm run init-db` - Initialize database tables

### Project Structure
```
server/
├── src/
│   ├── controllers/     # Route handlers
│   ├── middleware/      # Custom middleware
│   ├── models/         # Database models
│   ├── routes/         # API routes
│   ├── config/         # Configuration files
│   ├── scripts/        # Database scripts
│   └── app.js          # Express app setup
├── uploads/            # File upload directory
├── package.json
└── README.md
```

## Deployment

### Environment Variables for Production
- Set `NODE_ENV=production`
- Use strong `JWT_SECRET`
- Configure production database URL
- Set up file storage (Cloudinary, AWS S3, etc.)
- Configure email service for notifications

### Recommended Hosting Platforms
- **Railway**: Easy deployment with PostgreSQL
- **Render**: Good for Node.js apps with managed databases
- **DigitalOcean App Platform**: Simple deployment
- **AWS EC2**: More control but requires more setup
- **Heroku**: Easy deployment (though more expensive)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details
