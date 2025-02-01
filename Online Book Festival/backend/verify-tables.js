const pool = require('./db');

async function verifyTables() {
  try {
    const client = await pool.connect();
    
    // Check books table
    const booksResult = await client.query('SELECT * FROM books LIMIT 1');
    console.log('Books table exists');

    // Check orders table
    const ordersResult = await client.query('SELECT * FROM orders LIMIT 1');
    console.log('Orders table exists');

    // Check order_items table
    const orderItemsResult = await client.query('SELECT * FROM order_items LIMIT 1');
    console.log('Order_items table exists');

    console.log('All tables created successfully!');
    await client.release();
  } catch (err) {
    console.error('Error verifying tables:', err);
  } finally {
    await pool.end();
  }
}

verifyTables();