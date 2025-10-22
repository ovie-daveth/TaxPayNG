#!/bin/bash

echo "🚀 Starting TaxPayNG Backend Setup..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL is not installed. Please install PostgreSQL first."
    exit 1
fi

echo "✅ Prerequisites check passed"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp env.example .env
    echo "⚠️  Please edit .env file with your database credentials and other settings"
fi

# Create uploads directory if it doesn't exist
if [ ! -d uploads ]; then
    echo "📁 Creating uploads directory..."
    mkdir uploads
fi

echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your database credentials"
echo "2. Create PostgreSQL database: createdb taxpay_db"
echo "3. Initialize database: npm run init-db"
echo "4. Start development server: npm run dev"
echo ""
echo "API will be available at: http://localhost:3001"
echo "Health check: http://localhost:3001/health"
