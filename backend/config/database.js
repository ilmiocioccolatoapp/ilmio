const prisma = require('./prisma');

const connectDB = async () => {
  try {
    await prisma.$connect();
    console.log('PostgreSQL connected');
    return true;
  } catch (error) {
    console.error(`DB Error: ${error.message}`);
    // Never exit the process on Vercel serverless
    if (process.env.VERCEL !== '1') {
      process.exit(1);
    }
    return false;
  }
};

module.exports = connectDB;
