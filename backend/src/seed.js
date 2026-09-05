import 'dotenv/config';
import mongoose from 'mongoose';
import User from './models/User.js';
import Restaurant from './models/Restaurant.js';
import MenuItem from './models/MenuItem.js';
import TableSlot from './models/TableSlot.js';
import Table from './models/Table.js';
import Report from './models/Report.js';
import Review from './models/Review.js';
import Order from './models/Order.js';
<<<<<<< HEAD
import AdminInvite from './models/AdminInvite.js';
=======
>>>>>>> 1ed4806eca017c48e5ffc19d534dbae1fea1c856

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/quick-food');
    console.log('✓ Connected to MongoDB');

    // Clear existing data
    await Promise.all([
      User.deleteMany({}),
      Restaurant.deleteMany({}),
      MenuItem.deleteMany({}),
      TableSlot.deleteMany({}),
      Table.deleteMany({}),
      Report.deleteMany({}),
      Review.deleteMany({}),
      Order.deleteMany({}),
<<<<<<< HEAD
      AdminInvite.deleteMany({}),
=======
>>>>>>> 1ed4806eca017c48e5ffc19d534dbae1fea1c856
    ]);

    // Create admin user
    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@quickfood.com',
      password: 'admin123456',
      role: 'admin',
    });
    console.log('✓ Admin created');

<<<<<<< HEAD
    // Create a ready-to-use admin invitation code so super-admin signup works out of the box
    const adminInviteCode = process.env.ADMIN_INVITATION_CODE || 'QF-ADMINSEED1';
    await AdminInvite.create({
      code: adminInviteCode,
      createdBy: admin._id,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30), // 30 days
    });
    console.log('✓ Admin invite created (use this code on the signup page)');

=======
>>>>>>> 1ed4806eca017c48e5ffc19d534dbae1fea1c856
    // Create restaurant owners
    const owner = await User.create({
      name: "John's Restaurant",
      email: 'owner@quickfood.com',
      password: 'owner123456',
      role: 'owner',
      phone: '7807102986',
    });
    console.log('✓ Owner created');

    const owner2 = await User.create({
      name: 'Miso & More',
      email: 'owner2@quickfood.com',
      password: 'owner123456',
      role: 'owner',
      phone: '9898989898',
    });
    console.log('✓ Second owner created');

    // Create restaurants
    const restaurant = await Restaurant.create({
      owner: owner._id,
      name: 'The Green Fork',
      description: 'Modern Indian cuisine with healthy options',
      cuisine: ['Indian', 'Healthy'],
      location: '123 Main Street, Downtown',
      city: 'Mumbai',
<<<<<<< HEAD
      latitude: 19.076,
      longitude: 72.8777,
=======
>>>>>>> 1ed4806eca017c48e5ffc19d534dbae1fea1c856
      status: 'approved',
      verified: true,
      rating: 4.8,
      reviewCount: 125,
      openingTime: '11:00',
      closingTime: '23:00',
      deliveryTime: 30,
      minOrderValue: 300,
      deliveryCharge: 40,
    });
    console.log('✓ Restaurant created');

    const restaurant2 = await Restaurant.create({
      owner: owner2._id,
      name: 'Miso & More',
      description: 'Japanese ramen, sushi and small plates',
      cuisine: ['Japanese', 'Asian'],
      location: '8 Marine Drive, Promenade',
      city: 'Mumbai',
<<<<<<< HEAD
      latitude: 18.944,
      longitude: 72.823,
=======
>>>>>>> 1ed4806eca017c48e5ffc19d534dbae1fea1c856
      status: 'approved',
      verified: true,
      rating: 4.9,
      reviewCount: 98,
      openingTime: '12:00',
      closingTime: '22:30',
      deliveryTime: 25,
      minOrderValue: 250,
      deliveryCharge: 35,
    });
    console.log('✓ Second restaurant created');

    // Create menu items
    const menuItems = await MenuItem.create([
      {
        restaurant: restaurant._id,
        name: 'Paneer Tikka',
        description: 'Grilled cottage cheese marinated in spices',
        price: 250,
        category: 'Appetizers',
        isVeg: true,
        isAvailable: true,
        rating: 4.7,
        reviewCount: 45,
      },
      {
        restaurant: restaurant._id,
        name: 'Butter Chicken',
        description: 'Tender chicken in creamy tomato sauce',
        price: 350,
        category: 'Main Course',
        isVeg: false,
        isAvailable: true,
        rating: 4.9,
        reviewCount: 82,
      },
      {
        restaurant: restaurant._id,
        name: 'Vegetable Biryani',
        description: 'Fragrant rice with mixed vegetables',
        price: 280,
        category: 'Main Course',
        isVeg: true,
        isAvailable: true,
        rating: 4.6,
        reviewCount: 38,
      },
      {
        restaurant: restaurant._id,
        name: 'Mango Lassi',
        description: 'Refreshing yogurt-based mango drink',
        price: 80,
        category: 'Beverages',
        isVeg: true,
        isAvailable: true,
        rating: 4.5,
        reviewCount: 22,
      },
      {
        restaurant: restaurant2._id,
        name: 'Tonkotsu Ramen',
        description: 'Rich pork broth, chashu, ajitama egg',
        price: 420,
        category: 'Ramen',
        isVeg: false,
        isAvailable: true,
        rating: 4.9,
        reviewCount: 64,
      },
      {
        restaurant: restaurant2._id,
        name: 'Veggie Maki Roll',
        description: 'Avocado, cucumber and pickled radish',
        price: 310,
        category: 'Sushi',
        isVeg: true,
        isAvailable: true,
        rating: 4.6,
        reviewCount: 31,
      },
    ]);
    console.log('✓ Menu items created');

    // Demo reviewers + demo reviews so the homepage testimonials slider has
    // content right after seeding (both surfaces: Review collection + order ratings)
    const menuItemsByName = {};
    for (const item of menuItems) {
      menuItemsByName[item.name] = item;
    }

    const reviewerNames = ['Priya Sharma', 'Arjun Mehta', 'Sneha Kulkarni', 'Rahul Verma', 'Ananya Iyer', 'Karan Patel'];
    const reviewerEmails = [
      ['priya.sharma@example.com', '9000010011'],
      ['arjun.mehta@example.com', '9000010012'],
      ['sneha.kulkarni@example.com', '9000010013'],
      ['rahul.verma@example.com', '9000010014'],
      ['ananya.iyer@example.com', '9000010015'],
      ['karan.patel@example.com', '9000010016'],
    ];
    const reviewers = [];
    for (let i = 0; i < reviewerNames.length; i++) {
      reviewers.push(
        await User.create({
          name: reviewerNames[i],
          email: reviewerEmails[i][0],
          password: 'customer123456',
          role: 'customer',
          phone: reviewerEmails[i][1],
          address: '901 Demo Street, Mumbai',
          city: 'Mumbai',
          addresses: [
            { label: 'Home', line: '901 Demo Street, Mumbai', city: 'Mumbai', zip: '400058', phone: reviewerEmails[i][1], isDefault: true },
          ],
        })
      );
    }

    // Collection reviews (restaurant + food) — these get a verified-order badge via source 'review'
    const demoReviews = [
      {
        customer: reviewers[0],
        restaurant: restaurant._id,
        type: 'restaurant',
        rating: 5,
        comment: 'Amazing place! The service was quick and the food was absolutely delicious. Butter chicken was the highlight.',
      },
      {
        customer: reviewers[1],
        restaurant: restaurant._id,
        type: 'food',
        menuItem: menuItemsByName['Butter Chicken']?._id,
        rating: 5,
        comment: 'The butter chicken is a must-try. Creamy, rich and full of flavor. Easily the best in the city!',
      },
      {
        customer: reviewers[2],
        restaurant: restaurant2._id,
        type: 'restaurant',
        rating: 5,
        comment: 'The truffle ramen here is incredible! Great ambiance and the staff made our dinner so special.',
      },
      {
        customer: reviewers[3],
        restaurant: restaurant._id,
        type: 'food',
        menuItem: menuItemsByName['Paneer Tikka']?._id,
        rating: 4,
        comment: 'Paneer Tikka was fresh and perfectly spiced. Will be ordering again!',
      },
      {
        customer: reviewers[4],
        restaurant: restaurant2._id,
        type: 'food',
        menuItem: menuItemsByName['Matcha Tiramisu']?._id,
        rating: 5,
        comment: 'The Matcha Tiramisu was divine. A perfect end to a lovely meal.',
      },
    ];
    await Review.insertMany(
      demoReviews.map((rv) => ({
        customer: rv.customer._id,
        restaurant: rv.restaurant,
        menuItem: rv.menuItem,
        type: rv.type,
        rating: rv.rating,
        comment: rv.comment,
      }))
    );

    // Order-based reviews (stored on the Order) — these get a verified-order badge via source 'order'
    const demoItemIds = menuItems.map((m) => m._id);
    const demoOrderReviews = [
      {
        rating: 5,
        review: 'Ordered the Paneer Tikka and it arrived hot and fresh. Superb packaging and taste!',
      },
      {
        rating: 5,
        review: 'The restaurant delivered exactly what I ordered, on time. The food was amazing. Highly recommended!',
      },
      {
        rating: 4,
        review: 'Great food and fast delivery. The biryani was flavorful and the portion was generous.',
      },
    ];
    for (let i = 0; i < demoOrderReviews.length; i++) {
      const ord = demoOrderReviews[i];
      const reviewer = reviewers[i % reviewers.length];
      const pickedRestaurant = i % 2 === 0 ? restaurant : restaurant2;
      await Order.create({
        orderNumber: `ORD-DEMO-${1000 + i}`,
        customer: reviewer._id,
        restaurant: pickedRestaurant._id,
        items: [
          {
            menuItem: demoItemIds[i % demoItemIds.length],
            quantity: 1,
            price: Math.round(200 + Math.random() * 150),
          },
        ],
        subtotal: 250,
        deliveryCharge: 40,
        tax: Math.round(250 * 0.05),
        total: 250 + 40 + Math.round(250 * 0.05),
        paymentMethod: 'card',
        paymentStatus: 'completed',
        type: 'delivery',
        status: 'delivered',
        rating: ord.rating,
        review: ord.review,
        statusUpdates: [
          { status: 'placed', timestamp: new Date() },
          { status: 'confirmed', timestamp: new Date() },
          { status: 'delivered', timestamp: new Date() },
        ],
      });
    }
    console.log('✓ Demo reviews created');

    // Create tables (with QR codes) for both restaurants
    const mkTable = (restId, name, capacity, idx) => ({
      restaurant: restId,
      name,
      capacity,
      qrCode: `TBL-${name.replace(/\s+/g, '').toUpperCase()}-${idx}${restId.toString().slice(-4)}`,
    });

    await Table.create([
      mkTable(restaurant._id, 'T1', 2, 1),
      mkTable(restaurant._id, 'T2', 4, 2),
      mkTable(restaurant._id, 'T3', 4, 3),
      mkTable(restaurant._id, 'T4', 6, 4),
      mkTable(restaurant2._id, 'T1', 2, 5),
      mkTable(restaurant2._id, 'T2', 4, 6),
    ]);
    console.log('✓ Tables with QR codes created');

    // Create table slots for the next 7 days
    const slots = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);

      slots.push({
        restaurant: restaurant._id,
        date: date,
        startTime: '12:00',
        endTime: '13:00',
        capacity: 4,
        booked: 0,
      });

      slots.push({
        restaurant: restaurant._id,
        date: date,
        startTime: '13:00',
        endTime: '14:00',
        capacity: 4,
        booked: 0,
      });

      slots.push({
        restaurant: restaurant._id,
        date: date,
        startTime: '19:00',
        endTime: '20:00',
        capacity: 6,
        booked: 0,
      });

      slots.push({
        restaurant: restaurant._id,
        date: date,
        startTime: '20:00',
        endTime: '21:00',
        capacity: 6,
        booked: 0,
      });
    }

    await TableSlot.create(slots);
    console.log('✓ Table slots created');

    // Create test customer (with phone for OTP login + saved addresses)
    const customer = await User.create({
      name: 'Test Customer',
      email: 'customer@quickfood.com',
      password: 'customer123456',
      role: 'customer',
      phone: '9988776655',
      address: '456 Oak Avenue, Suburbs',
      city: 'Mumbai',
      addresses: [
        { label: 'Home', line: '456 Oak Avenue, Suburbs', city: 'Mumbai', zip: '400050', phone: '9988776655', isDefault: true },
        { label: 'Work', line: '12th Floor, Tech Park One, Andheri East', city: 'Mumbai', zip: '400069', phone: '9988776655' },
      ],
    });
    console.log('✓ Customer created');

    // Sample complaint/report for the admin panel
    await Report.create({
      customer: customer._id,
      restaurant: restaurant._id,
      category: 'other',
      subject: 'Wrong item delivered last week',
      description: 'My previous order was missing the Mango Lassi I paid for. Please look into it.',
    });
    console.log('✓ Sample report created');

    // Print table QR codes for quick testing of the dine-in flow
    const tables = await Table.find();
    console.log('\nTable QR codes (visit /table/<code>):');
    for (const t of tables) {
      const rest = t.restaurant.toString() === restaurant._id.toString() ? 'The Green Fork' : 'Miso & More';
      console.log(`  ${rest} · ${t.name}: ${t.qrCode}`);
    }

    console.log('\n✓ Database seeded successfully!');
    console.log('\nTest Accounts:');
<<<<<<< HEAD
    console.log(`Super Admin invite code: ${process.env.ADMIN_INVITATION_CODE || 'QF-ADMINSEED1'}`);
=======
>>>>>>> 1ed4806eca017c48e5ffc19d534dbae1fea1c856
    console.log('Admin: admin@quickfood.com / admin123456');
    console.log('Owner: owner@quickfood.com / owner123456');
    console.log('Owner 2: owner2@quickfood.com / owner123456');
    console.log('Customer: customer@quickfood.com / customer123456');
    console.log('Customer phone (OTP login): 9988776655');

    process.exit(0);
  } catch (error) {
    console.error('✗ Error seeding database:', error.message);
    process.exit(1);
  }
};

seed();
