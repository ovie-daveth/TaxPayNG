# MongoDB Setup Guide for TaxPayNG Backend

## ✅ MongoDB Conversion Complete!

Your backend has been successfully converted from PostgreSQL to MongoDB. Here's how to set it up:

## 1. Install MongoDB

### Option A: Download MongoDB Community Server
1. Go to https://www.mongodb.com/try/download/community
2. Download MongoDB Community Server for Windows
3. Run the installer and follow the setup wizard
4. MongoDB will start automatically as a Windows service

### Option B: Using Chocolatey (if you have it)
```powershell
choco install mongodb
```

## 2. Create Environment File

Create a `.env` file in your `server` directory:

```env
# Environment Configuration
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:3000

# Database Configuration (MongoDB)
MONGODB_URI=mongodb://localhost:27017/taxpay_db

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# ImageKit Configuration (optional for now)
IMAGEKIT_PUBLIC_KEY=your-imagekit-public-key
IMAGEKIT_PRIVATE_KEY=your-imagekit-private-key
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your-imagekit-id

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS Configuration
CORS_ORIGIN=http://localhost:3000
CORS_CREDENTIALS=true
```

## 3. Start MongoDB Service

Make sure MongoDB is running:

```powershell
# Check if MongoDB is running
net start MongoDB

# Or start it manually
mongod
```

## 4. Initialize Database

```bash
cd server
npm run init-db
```

## 5. Start the Server

```bash
npm run dev
```

## 🎉 That's it!

MongoDB is much simpler than PostgreSQL:

- ✅ **No database creation needed** - MongoDB creates databases automatically
- ✅ **No table creation needed** - Collections are created when first document is inserted
- ✅ **No migrations needed** - Schema is flexible and evolves automatically
- ✅ **No complex setup** - Just install and run

## MongoDB Collections Created

When you start using the API, these collections will be created automatically:

- `users` - User accounts and profiles
- `transactions` - Income and expense records  
- `documents` - File metadata (ImageKit URLs)
- `reminders` - Tax deadlines and tasks
- `taxcalculations` - Tax calculation results

## Benefits of MongoDB

- **Flexible Schema** - Easy to add new fields without migrations
- **JSON-like Documents** - Perfect for JavaScript/Node.js
- **Automatic Scaling** - Handles growth easily
- **Rich Queries** - Powerful query capabilities
- **No SQL Knowledge Required** - Works naturally with JavaScript

## Testing the Setup

1. Start MongoDB service
2. Run `npm run init-db` 
3. Run `npm run dev`
4. Visit `http://localhost:3001/health`

You should see:
```json
{
  "success": true,
  "message": "TaxPayNG API is running",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "environment": "development"
}
```

## Troubleshooting

**MongoDB not starting?**
- Check if port 27017 is available
- Run as administrator
- Check Windows services for MongoDB

**Connection failed?**
- Ensure MongoDB service is running
- Check your MONGODB_URI in .env file
- Default URI: `mongodb://localhost:27017/taxpay_db`

**Need help?**
- MongoDB documentation: https://docs.mongodb.com/
- Mongoose documentation: https://mongoosejs.com/docs/
