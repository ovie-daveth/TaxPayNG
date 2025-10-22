const { connectDB } = require('../config/database');

const initializeDatabase = async () => {
  try {
    console.log('🔄 Initializing MongoDB database...');
    
    // Connect to MongoDB
    await connectDB();
    
    console.log('✅ MongoDB database initialized successfully');
    console.log('📊 Collections will be created automatically when first document is inserted');
    console.log('   - users');
    console.log('   - transactions');
    console.log('   - documents');
    console.log('   - reminders');
    console.log('   - taxcalculations');
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
};

// Run initialization if this file is executed directly
if (require.main === module) {
  initializeDatabase()
    .then(() => {
      console.log('🎉 Database setup complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Database setup failed:', error);
      process.exit(1);
    });
}

module.exports = { initializeDatabase };