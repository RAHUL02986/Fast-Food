import mongoose from 'mongoose';
import Order from './src/models/Order.js';
import dotenv from 'dotenv';

dotenv.config();

async function fixOrders() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/quickfood');
    console.log('Connected to MongoDB');

    // Find all delivery orders
    const orders = await Order.find({ type: 'delivery' });
    console.log(`Found ${orders.length} delivery orders`);

    for (const order of orders) {
      console.log(`\nOrder: ${order.orderNumber}`);
      console.log(`  Customer type: ${typeof order.customer}`);
      console.log(`  Customer value: ${order.customer}`);

      // Check if customer is an ObjectId (not populated)
      if (order.customer && typeof order.customer === 'object' && order.customer._id) {
        console.log('  Customer is populated:', order.customer.name, order.customer.phone);
      } else {
        console.log('  Customer is NOT populated (ObjectId only)');
      }
    }

    // Close connection
    await mongoose.connection.close();
    console.log('\nDone!');
  } catch (error) {
    console.error('Error:', error.message);
  }
}

fixOrders();
