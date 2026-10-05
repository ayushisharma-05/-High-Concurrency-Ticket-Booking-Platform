require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Event = require('./models/Event');
const Booking = require('./models/Booking');

// Mock data utilities
const generateSeats = (rows = [ {row: 'A', count: 5, price: 1500}, {row: 'B', count: 5, price: 1000}, {row: 'C', count: 5, price: 500} ]) => {
  const seats = [];
  rows.forEach(conf => {
    for (let i = 1; i <= conf.count; i++) {
      seats.push({
        seatId: `${conf.row}${i}`,
        row: conf.row,
        number: i,
        price: conf.price,
        status: 'AVAILABLE'
      });
    }
  });
  return seats;
};

const eventsData = [
  { title: "Coldplay: Music of the Spheres", venue: "Wembley Stadium", desc: "Experience the magic of Coldplay live in concert.", hoursOffset: 24, rows: [ {row: 'A', count: 8, price: 5000}, {row: 'B', count: 8, price: 3000}, {row: 'C', count: 8, price: 1500} ] },
  { title: "Tech Innovators Summit 2026", venue: "Moscone Center", desc: "The biggest tech conference featuring speakers from top companies.", hoursOffset: 48, rows: [ {row: 'A', count: 5, price: 2000}, {row: 'B', count: 10, price: 1000} ] },
  { title: "Standup Comedy with Dave Chappelle", venue: "Madison Square Garden", desc: "An evening of non-stop laughter. 18+ only.", hoursOffset: 72, rows: [ {row: 'A', count: 5, price: 2500}, {row: 'B', count: 5, price: 1500}, {row: 'C', count: 5, price: 1000}, {row: 'D', count: 5, price: 800} ] },
  { title: "Hamilton: The Musical", venue: "Broadway Theater", desc: "The award-winning musical comes to your city.", hoursOffset: 120, rows: [ {row: 'A', count: 6, price: 4000}, {row: 'B', count: 6, price: 2500}, {row: 'C', count: 6, price: 1500} ] },
  { title: "UEFA Champions League Final", venue: "Allianz Arena", desc: "The biggest match in European club football.", hoursOffset: 168, rows: [ {row: 'VIP', count: 5, price: 10000}, {row: 'A', count: 10, price: 5000}, {row: 'B', count: 10, price: 2000} ] },
  { title: "Astro-Photography Workshop", venue: "Grand Canyon National Park", desc: "Learn to capture the night sky with professionals.", hoursOffset: 200, rows: [ {row: 'A', count: 5, price: 3000} ] },
  { title: "Symphony Orchestra: Beethoven's 9th", venue: "Royal Albert Hall", desc: "A classical masterpiece performed by world-class musicians.", hoursOffset: 240, rows: [ {row: 'A', count: 5, price: 1200}, {row: 'B', count: 8, price: 800}, {row: 'C', count: 10, price: 500} ] },
  { title: "Food & Wine Festival 2026", venue: "Central Park", desc: "Taste the best from renowned chefs worldwide.", hoursOffset: 300, rows: [ {row: 'A', count: 15, price: 800} ] },
  { title: "Startup Pitch Night", venue: "Innovation Hub", desc: "Watch 10 startups pitch to top VC firms.", hoursOffset: 350, rows: [ {row: 'A', count: 5, price: 500}, {row: 'B', count: 10, price: 200} ] },
  { title: "Maroon 5 Live Concert", venue: "O2 Arena", desc: "Sing along to your favorite hits.", hoursOffset: 400, rows: [ {row: 'A', count: 5, price: 3500}, {row: 'B', count: 5, price: 2500}, {row: 'C', count: 5, price: 1500} ] },
  { title: "Global E-Sports Championship", venue: "Staples Center", desc: "Top teams battle it out for $5M prize pool.", hoursOffset: 450, rows: [ {row: 'A', count: 8, price: 2000}, {row: 'B', count: 12, price: 1200}, {row: 'C', count: 15, price: 700} ] },
  { title: "Art Biennale Exhibition", venue: "Louvre Museum", desc: "Contemporary art from 50+ countries.", hoursOffset: 500, rows: [ {row: 'A', count: 20, price: 1000} ] }
];

async function seedDatabase() {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/ticket-booking';
    await mongoose.connect(mongoUri);
    console.log('Connected to Database...');

    // 1. CLEAR EXISTING DATA
    await User.deleteMany();
    await Event.deleteMany();
    await Booking.deleteMany();
    console.log('Cleared existing data.');

    // 2. CREATE USERS
    const admin = await User.create({ name: 'Admin User', email: 'admin@eventhub.com', password: 'password123', role: 'ADMIN' });
    const user1 = await User.create({ name: 'John Doe', email: 'john@example.com', password: 'password123', role: 'USER' });
    const user2 = await User.create({ name: 'Jane Smith', email: 'jane@example.com', password: 'password123', role: 'USER' });
    const user3 = await User.create({ name: 'Alice Johnson', email: 'alice@example.com', password: 'password123', role: 'USER' });
    console.log('Created Users.');

    // 3. CREATE EVENTS
    const createdEvents = [];
    for (const ev of eventsData) {
      const date = new Date();
      date.setHours(date.getHours() + ev.hoursOffset);
      
      const newEvent = await Event.create({
        title: ev.title,
        description: ev.desc,
        date: date,
        venue: ev.venue,
        isPublished: true,
        seats: generateSeats(ev.rows),
        createdBy: admin._id
      });
      createdEvents.push(newEvent);
    }
    console.log(`Created ${createdEvents.length} Events.`);

    // 4. CREATE RANDOM BOOKINGS
    const users = [admin, user1, user2, user3];
    let totalBookings = 0;

    for (const event of createdEvents) {
      // Pick 2-4 random users to book seats in this event
      const numBookers = Math.floor(Math.random() * 3) + 2; 
      
      for (let i = 0; i < numBookers; i++) {
        const randomUser = users[Math.floor(Math.random() * users.length)];
        
        // Find 2 available seats
        const availableSeats = event.seats.filter(s => s.status === 'AVAILABLE');
        if (availableSeats.length < 2) continue;

        const seatIds = [availableSeats[0].seatId, availableSeats[1].seatId];
        const totalAmount = availableSeats[0].price + availableSeats[1].price;
        
        // Pick random status
        const statuses = ['CONFIRMED', 'CONFIRMED', 'CONFIRMED', 'CANCELLED', 'FAILED'];
        const finalStatus = statuses[Math.floor(Math.random() * statuses.length)];

        // Create booking
        const booking = await Booking.create({
          user: randomUser._id,
          event: event._id,
          seats: seatIds,
          totalAmount,
          status: finalStatus,
          paymentStatus: finalStatus === 'CONFIRMED' ? 'SUCCESS' : 'FAILED',
          createdAt: new Date(Date.now() - Math.floor(Math.random() * 10000000000)) // random past date
        });

        // Update Seats status in Event if Confirmed
        if (finalStatus === 'CONFIRMED') {
          for (const s of seatIds) {
            const seatIndex = event.seats.findIndex(x => x.seatId === s);
            if (seatIndex !== -1) {
              event.seats[seatIndex].status = 'BOOKED';
              event.seats[seatIndex].bookingId = booking._id;
            }
          }
          await event.save();
        }
        totalBookings++;
      }
    }
    
    console.log(`Created ${totalBookings} Bookings with various state (Confirmed/Cancelled/Failed).`);
    console.log('\n--- SEEDING COMPLETE ---');
    console.log('Login Credentials:');
    console.log('Admin -> admin@eventhub.com / password123');
    console.log('User  -> john@example.com / password123\n');
    process.exit(0);
  } catch (error) {
    console.error('Seed Error:', error);
    process.exit(1);
  }
}

seedDatabase();
