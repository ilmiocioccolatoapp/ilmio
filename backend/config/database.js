const prisma = require('./prisma');
const { logError } = require('../utils/errors');

const connectDB = async () => {
  try {
    await prisma.$connect();
    console.log('PostgreSQL connected');
    return true;
  } catch (error) {
    logError('Database connection failed', error);
    // Never exit the process on Vercel serverless
    if (process.env.VERCEL !== '1') {
      process.exit(1);
    }
    return false;
  }
};

module.exports = connectDB;
