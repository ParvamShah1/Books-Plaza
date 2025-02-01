const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const { body, validationResult } = require('express-validator');
const app = express();
const port = process.env.PORT || 3001;
const db = require('./db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const session = require('express-session');
const fs = require('fs');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Load environment variables
require('dotenv').config();

// Validate PayU configuration
if (!process.env.PAYU_MERCHANT_KEY || !process.env.PAYU_MERCHANT_SALT) {
  console.error('PayU credentials are missing');
  process.exit(1);
}

const PAYU_BASE_URL = process.env.PAYU_MODE === 'production'
  ? 'https://secure.payu.in'
  : 'https://sandboxsecure.payu.in';

const API_URL = process.env.API_URL || 'http://localhost:3001';

// CORS options
const corsOptions = {
  origin: true, // This allows all origins
  credentials: true // Important for cookies
};

app.use(cors(corsOptions));
app.use(bodyParser.json());

// Session configuration
app.use(
  session({
    secret: 'your_session_secret',
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24,
      sameSite: 'lax'
    },
    name: 'sessionId' // Custom name for the session cookie
  })
);

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// Admin code middleware
const checkAdminCode = (req, res, next) => {
  const adminCode = req.headers['admincode'];
  if (!adminCode || adminCode !== '1909') {
    return res.status(401).json({ message: 'Unauthorized: Invalid admin code' });
  }
  next();
};

// Upload a new book (with image upload and validation)
app.post('/api/books', upload.single('image'), [
  body('title').notEmpty().trim().escape().withMessage('Title is required'),
  body('author').notEmpty().trim().escape().withMessage('Author is required'),
  body('description').notEmpty().trim().escape().withMessage('Description is required'),
  body('price').isFloat({ min: 0.01 }).withMessage('Price must be a positive number'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { title, author, description, price } = req.body;
    console.log('req.file:', req.file);
    const imageUrl = req.file ? `${API_URL}/uploads/${req.file.filename}` : null;
    console.log('Inserting:', { title, author, description, price, imageUrl });

    // Your original INSERT statement:
    const result = await db.query(
      'INSERT INTO books (title, author, description, price, image_url) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [title, author, description, price, imageUrl]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error uploading book:', err);
    if (err.code === '23505') {
      return res.status(400).json({ error: 'A book with that title already exists' });
    }
    res.status(500).json({ error: 'Error uploading book' });
  }
});

// Get All Books (Admin) - Requires Authentication
app.get('/api/admin/books', checkAdminCode, async (req, res) => {
  try {
    // Extract query parameters for pagination, filtering, and sorting
    const page = parseInt(req.query.page) || 1; // Default to page 1
    const limit = parseInt(req.query.limit) || 10; // Default limit to 10 books per page
    const offset = (page - 1) * limit;
    const { title, author, sortBy, sortOrder } = req.query;

    // Build the WHERE clause for filtering
    let whereClause = '';
    let queryParams = [limit, offset];
    let paramIndex = 3; // Start with $3 because $1 and $2 are for limit and offset

    if (title) {
      whereClause += ` WHERE title ILIKE $${paramIndex}`; // ILIKE for case-insensitive search
      queryParams.push(`%${title}%`);
      paramIndex++;
    }

    if (author) {
      whereClause += whereClause ? ` AND author ILIKE $${paramIndex}` : ` WHERE author ILIKE $${paramIndex}`;
      queryParams.push(`%${author}%`);
      paramIndex++;
    }

    // Build the ORDER BY clause for sorting
    let orderByClause = ' ORDER BY created_at DESC'; // Default sorting by creation date
    if (sortBy) {
      const validSortFields = ['title', 'author', 'price', 'created_at']; // Add other valid fields
      const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at';
      const sortDir = sortOrder === 'asc' ? 'ASC' : 'DESC';
      orderByClause = ` ORDER BY ${sortField} ${sortDir}`;
    }

    // Query to get the total count of books (for pagination)
    const countResult = await db.query(`SELECT COUNT(*) FROM books ${whereClause.replace(/(\$\d+)/g, (match, p1) => `$${parseInt(p1.slice(1)) - 2}`)}`, queryParams.slice(2)); // Adjust param indexes for count query
    const totalBooks = parseInt(countResult.rows[0].count);

    // Query to get the paginated books
    const booksResult = await db.query(
      `SELECT * FROM books ${whereClause} ${orderByClause} LIMIT $1 OFFSET $2`,
      queryParams
    );

    const books = booksResult.rows.map(book => ({
      ...book,
      image_url: book.image_url ? `${API_URL}/uploads/${path.basename(book.image_url)}` : null
    }));

    res.json({
      books,
      totalBooks,
      currentPage: page,
      totalPages: Math.ceil(totalBooks / limit),
    });
  } catch (err) {
    console.error('Error fetching books (admin):', err);
    res.status(500).json({ error: 'Error fetching books' });
  }
});

app.post('/api/admin/books', checkAdminCode, upload.single('image'), [
  body('title').notEmpty().trim().escape().withMessage('Title is required'),
  body('author').notEmpty().trim().escape().withMessage('Author is required'),
  body('description').notEmpty().trim().escape().withMessage('Description is required'),
  body('price').isFloat({ min: 0.01 }).withMessage('Price must be a positive number'),
  body('genre').notEmpty().trim().escape().withMessage('Genre is required'),
  body('language').notEmpty().trim().escape().withMessage('Language is required'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { title, author, description, price, genre, language } = req.body;
    const imageUrl = req.file ? `${API_URL}/uploads/${req.file.filename}` : null;

    const result = await db.query(
      'INSERT INTO books (title, author, description, price, image_url, genre, language) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [title, author, description, price, imageUrl, genre, language]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error uploading book:', err);
    if (err.code === '23505') {
      return res.status(400).json({ error: 'A book with that title already exists' });
    }
    res.status(500).json({ error: 'Error uploading book' });
  }
});

app.put('/api/admin/books/:id', checkAdminCode, upload.single('image'), [
  body('title').optional().trim().escape(), // Make fields optional
  body('author').optional().trim().escape(),
  body('description').optional().trim().escape(),
  body('price').optional().isFloat({ min: 0.01 }),
  body('genre').optional().trim().escape(),
  body('language').optional().trim().escape(),
], async (req, res) => {
  try {
    const { id } = req.params;
    const { title, author, description, price, genre, language } = req.body;
    
    let imageUrl = undefined;
    if (req.file) {
      imageUrl = `${API_URL}/uploads/${req.file.filename}`;
    }

    const updateFields = ['title', 'author', 'description', 'price', 'genre', 'language'];
    const values = [title, author, description, price, genre, language];
    
    if (imageUrl) {
      updateFields.push('image_url');
      values.push(imageUrl);
    }

    const query = `
      UPDATE books 
      SET ${updateFields.map((field, index) => `${field} = $${index + 1}`).join(', ')}
      WHERE book_id = $${values.length + 1}
      RETURNING *
    `;

    values.push(id);
    const result = await db.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating book:', err);
    res.status(500).json({ error: 'Error updating book' });
  }
});

app.delete('/api/admin/books/:id', checkAdminCode, async (req, res) => {
  const bookId = req.params.id;

  try {
    // 1. Check if the book exists and if the user is an admin
    const bookResult = await db.query('SELECT * FROM books WHERE book_id = $1', [bookId]);
    if (bookResult.rows.length === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }
    const book = bookResult.rows[0];

    // Add logic here to check if the user is an admin (e.g., based on a role in the JWT)

    // 2. Delete the associated image file (if it exists)
    if (book.image_url) {
      const imagePath = path.join(__dirname, book.image_url);
      fs.unlink(imagePath, (err) => {
        if (err) console.error('Error deleting image:', err);
      });
    }

    // 3. Delete the book from the database
    await db.query('DELETE FROM books WHERE book_id = $1', [bookId]);

    res.json({ message: 'Book deleted successfully' });
  } catch (err) {
    console.error('Error deleting book:', err);
    res.status(500).json({ error: 'Error deleting book' });
  }
});

app.patch('/api/admin/books/:id/status', checkAdminCode, async (req, res) => {
  try {
    const { id } = req.params;
    const { active } = req.body;

    const result = await db.query(
      'UPDATE books SET is_active = $1 WHERE book_id = $2 RETURNING *',
      [active, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating book status:', err);
    res.status(500).json({ error: 'Error updating book status' });
  }
});

// Get All Orders (Admin) - Requires Authentication
app.get('/api/admin/orders', checkAdminCode, async (req, res) => {
  try {
    // Extract query parameters for pagination, filtering, and sorting
    const page = parseInt(req.query.page) || 1; // Default to page 1
    const limit = parseInt(req.query.limit) || 10; // Default limit to 10 orders per page
    const offset = (page - 1) * limit;
    const { status, startDate, endDate, sortBy, sortOrder } = req.query;

    // Build the WHERE clause for filtering
    let whereClause = '';
    let queryParams = [limit, offset];
    let paramIndex = 3; // Start with $3 because $1 and $2 are for limit and offset

    if (status) {
      whereClause += ` WHERE payment_status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }

    if (startDate && endDate) {
      whereClause += whereClause ? ` AND order_date BETWEEN $${paramIndex} AND $${paramIndex + 1}` : ` WHERE order_date BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
      queryParams.push(startDate, endDate);
      paramIndex += 2;
    }

    // Build the ORDER BY clause for sorting
    let orderByClause = ' ORDER BY order_date DESC'; // Default sorting by order date
    if (sortBy) {
      const validSortFields = ['order_date', 'total_amount']; // Add other valid fields
      const sortField = validSortFields.includes(sortBy) ? sortBy : 'order_date';
      const sortDir = sortOrder === 'asc' ? 'ASC' : 'DESC';
      orderByClause = ` ORDER BY ${sortField} ${sortDir}`;
    }

    // Query to get the total count of orders (for pagination)
    const countResult = await db.query(`SELECT COUNT(*) FROM orders ${whereClause.replace(/(\$\d+)/g, (match, p1) => `$${parseInt(p1.slice(1)) - 2}`)}`, queryParams.slice(2)); // Adjust param indexes for count query
    const totalOrders = parseInt(countResult.rows[0].count);

    // Query to get the paginated orders
    let orderQuery = `
      WITH OrdersWithItems AS (
        SELECT 
          o.order_id,
          o.created_at as order_date,
          o.total_amount,
          o.payment_status,
          o.shipping_address,
          o.customer_name,
          o.customer_email,
          o.customer_phone,
          o.payment_id,
          o.transaction_id,
          json_agg(
            json_build_object(
              'id', oi.id,
              'title', b.title,
              'quantity', oi.quantity,
              'price', oi.price
            )
          ) as items
        FROM orders o
        LEFT JOIN order_items oi ON o.order_id = oi.order_id
        LEFT JOIN books b ON oi.book_id = b.book_id
        ${whereClause}
        GROUP BY 
          o.order_id,
          o.created_at,
          o.total_amount,
          o.payment_status,
          o.shipping_address,
          o.customer_name,
          o.customer_email,
          o.customer_phone,
          o.payment_id,
          o.transaction_id
        ${orderByClause}
      )
      SELECT *
      FROM OrdersWithItems
      LIMIT $1 OFFSET $2`;

    const ordersResult = await db.query(orderQuery, queryParams);
    
    // Transform the response to match the frontend's expected format
    const orders = ordersResult.rows.map(order => ({
      ...order,
      items: order.items[0] === null ? [] : order.items // Handle case when there are no items
    }));

    res.json({
      orders,
      totalOrders,
      currentPage: page,
      totalPages: Math.ceil(totalOrders / limit),
    });
  } catch (err) {
    console.error('Error fetching orders (admin):', err);
    res.status(500).json({ error: 'Error fetching orders' });
  }
});

app.get('/api/books/featured', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM books WHERE is_active = TRUE ORDER BY created_at DESC LIMIT 8');
    
    const books = result.rows.map(book => ({
      ...book,
      image_url: book.image_url ? `${API_URL}/uploads/${path.basename(book.image_url)}` : null
    }));

    res.json(books);
  } catch (err) {
    console.error('Error fetching featured books:', err);
    res.status(500).json({ error: 'Error fetching featured books' });
  }
});

// Update book status
app.patch('/api/admin/books/:id/status', checkAdminCode, async (req, res) => {
  try {
    const { id } = req.params;
    const { active } = req.body;

    const result = await db.query(
      'UPDATE books SET is_active = $1 WHERE book_id = $2 RETURNING *',
      [active, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating book status:', err);
    res.status(500).json({ error: 'Error updating book status' });
  }
});

// Update book details
app.put('/api/admin/books/:id', checkAdminCode, upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, author, description, price, genre, language } = req.body;
    
    // Check if the book exists
    const existingBook = await db.query('SELECT * FROM books WHERE book_id = $1', [id]);
    if (existingBook.rows.length === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }

    let imageUrl = existingBook.rows[0].image_url;
    
    // If a new image is uploaded, update the image_url
    if (req.file) {
      imageUrl = `${API_URL}/uploads/${req.file.filename}`;
      
      // Delete old image if it exists
      if (existingBook.rows[0].image_url) {
        const oldImagePath = path.join(__dirname, existingBook.rows[0].image_url);
        try {
          fs.unlinkSync(oldImagePath);
        } catch (err) {
          console.error('Error deleting old image:', err);
        }
      }
    }

    const result = await db.query(
      'UPDATE books SET title = $1, author = $2, description = $3, price = $4, genre = $5, language = $6, image_url = $7 WHERE book_id = $8 RETURNING *',
      [title, author, description, price, genre, language, imageUrl, id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating book:', err);
    if (err.code === '23505') {
      return res.status(400).json({ error: 'A book with that title already exists' });
    }
    res.status(500).json({ error: 'Error updating book' });
  }
});

// Get single book details
app.get('/api/books/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT * FROM books WHERE book_id = $1 AND is_active = TRUE', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }

    const book = {
      ...result.rows[0],
      image_url: result.rows[0].image_url ? `${API_URL}/uploads/${path.basename(result.rows[0].image_url)}` : null
    };

    res.json(book);
  } catch (err) {
    console.error('Error fetching book details:', err);
    res.status(500).json({ error: 'Error fetching book details' });
  }
});

app.post('/api/orders', async (req, res) => {
  try {
    const { cartItems, userDetails, shippingAddress } = req.body;

    // Store order details in the database
    const orderResult = await db.query(
      'INSERT INTO orders (order_date, total_amount, payment_status, email) VALUES ($1, $2, $3, $4) RETURNING *',
      [new Date(), calculateTotalAmount(cartItems), 'pending', userDetails.email]
    );
    const orderId = orderResult.rows.order_id;

    // Store order items
    for (const item of cartItems) {
      await db.query(
        'INSERT INTO order_items (order_id, book_id, quantity, price) VALUES ($1, $2, $3, $4)',
        [orderId, item.book_id, item.quantity, item.price]
      );
    }

    // Update book stock (if applicable) - Implement your logic here

    // Send confirmation email
    sendConfirmationEmail(userDetails.email, orderId, cartItems, shippingAddress);

    res.status(201).json({ message: 'Order placed successfully', orderId });
  } catch (err) {
    console.error('Error placing order:', err);
    res.status(500).json({ error: 'Error placing order' });
  }
});

app.post('/api/create-payment', async (req, res) => {
  // Validate PayU configuration
  if (!process.env.PAYU_MERCHANT_KEY || !process.env.PAYU_MERCHANT_SALT) {
    return res.status(500).json({
      error: 'Payment configuration error',
      details: 'PayU merchant key or salt is missing'
    });
  }
  console.log('Received payment request:', {
    ...req.body,
    email: '***@***', // Hide sensitive data
    phone: '***'
  });
  try {
    const { amount, productinfo, firstname, email, phone, cartItems, shippingAddress } = req.body;
    
    if (!amount || !productinfo || !firstname || !email || !phone) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const txnid = 'TXN_' + Date.now();
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const backendUrl = process.env.API_URL || 'http://localhost:3001';

    // Prepare UDF fields with proper encoding
    const udf1 = frontendUrl;
    const udf2 = JSON.stringify(cartItems || []);
    const udf3 = JSON.stringify(shippingAddress || {});
    const udf4 = '';
    const udf5 = '';

    // Generate hash
    const hashString = [
      process.env.PAYU_MERCHANT_KEY,
      txnid,
      amount.toString(),
      productinfo,
      firstname,
      email,
      udf1,
      udf2,
      udf3,
      udf4,
      udf5,
      '',  // empty string for unused fields
      '',
      '',
      '',
      '',
      '',
      process.env.PAYU_MERCHANT_SALT
    ].join('|');
    
    const hash = crypto.createHash('sha512').update(hashString).digest('hex');

    // Log hash string for debugging (excluding sensitive data)
    console.log('Hash generated for transaction:', txnid);
    console.log('Payment data prepared:', {
      txnid,
      amount: amount.toString(),
      productinfo,
      firstname,
      hash: hash.substring(0, 10) + '...' // Show only first 10 chars of hash
    });

    // Prepare payment data
    const paymentData = {
      key: process.env.PAYU_MERCHANT_KEY,
      txnid: txnid,
      amount: amount.toString(),
      productinfo: productinfo,
      firstname: firstname,
      email: email,
      phone: phone,
      surl: `${backendUrl}/api/payment-success`,
      furl: `${backendUrl}/api/payment-failure`,
      curl: `${backendUrl}/api/payment-cancel`,
      service_provider: 'payu_paisa',
      hash: hash,
      udf1: udf1,
      udf2: udf2,
      udf3: udf3,
      udf4: udf4,
      udf5: udf5,
      lastname: '',
      address1: shippingAddress.address || '',
      address2: shippingAddress.apartment || '',
      city: shippingAddress.city || '',
      state: shippingAddress.state || '',
      country: shippingAddress.country || '',
      zipcode: shippingAddress.zipCode || '',
      pg: 'CC',
      bankcode: 'CC',
      ccnum: '', // Leave empty, will be filled by PayU
      ccname: '', // Leave empty, will be filled by PayU
      ccvv: '', // Leave empty, will be filled by PayU
      ccexpmon: '', // Leave empty, will be filled by PayU
      ccexpyr: '', // Leave empty, will be filled by PayU
      enforce_paymethod: 'cc',
      api_version: '1',
      shipping_firstname: firstname,
      shipping_lastname: '',
      shipping_address1: shippingAddress.address || '',
      shipping_address2: shippingAddress.apartment || '',
      shipping_city: shippingAddress.city || '',
      shipping_state: shippingAddress.state || '',
      shipping_country: shippingAddress.country || '',
      shipping_zipcode: shippingAddress.zipCode || '',
      shipping_phone: phone,
      offer_key: '',
      debug: '1'
    };



    // Final verification of payment data
    if (!paymentData.hash || !paymentData.key) {
      throw new Error('Payment hash or key is missing');
    }

    res.json(paymentData);
  } catch (error) {
    console.error('Error creating payment:', {
      message: error.message,
      stack: error.stack,
      data: error.response?.data
    });
    res.status(500).json({
      error: 'Failed to create payment',
      details: error.message
    });
  }
});

// Payment success handler
app.post('/api/payment-success', async (req, res) => {
  try {
    console.log('Payment success callback received:', {
      ...req.body,
      key: '***',
      hash: '***'
    });

    const {
      txnid, status, amount, productinfo, firstname, email,
      mihpayid, udf1, udf2, udf3, udf4, udf5, hash
    } = req.body;

    const frontendUrl = udf1 || process.env.FRONTEND_URL || 'http://localhost:3000';

    // Verify response hash
    const hashSequence = [
      process.env.PAYU_MERCHANT_SALT,
      status,
      '', '', '', '', '',
      udf5 || '',
      udf4 || '',
      udf3 || '',
      udf2 || '',
      udf1 || '',
      email,
      firstname,
      productinfo,
      amount,
      txnid,
      process.env.PAYU_MERCHANT_KEY
    ];

    const hashString = hashSequence.join('|');
    console.log('Verifying hash with string:', hashString);
    const calculatedHash = crypto.createHash('sha512').update(hashString).digest('hex');

    if (calculatedHash.toLowerCase() !== hash.toLowerCase()) {
      console.error('Hash verification failed');
      console.log('Calculated hash:', calculatedHash);
      console.log('Received hash:', hash);
      return res.redirect(`${frontendUrl}/payment-failed?error=hash_mismatch`);
    }

    // Parse cart items and shipping address
    let cartItems = [];
    let shippingAddress = {};
    try {
      cartItems = JSON.parse(udf2 || '[]');
      shippingAddress = JSON.parse(udf3 || '{}');
    } catch (error) {
      console.error('Error parsing UDF fields:', error);
    }

    // Save order to database
    await saveOrder({
      txnid,
      mihpayid,
      firstname,
      email,
      phone: req.body.phone,
      address: shippingAddress,
      amount: parseFloat(amount),
      items: cartItems,
      payment_status: status
    });

    // Redirect to frontend success page
    res.redirect(`${frontendUrl}/payment-success?orderId=${txnid}`);
  } catch (error) {
    console.error('Error processing payment success:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/payment-failed?error=server_error`);
  }
});

// Payment cancel handler
app.post('/api/payment-cancel', (req, res) => {
  console.log('Payment cancelled:', req.body);
  const frontendUrl = req.body.udf1 || process.env.FRONTEND_URL || 'http://localhost:3000';
  res.redirect(`${frontendUrl}/payment-failed?error=cancelled`);
});

// Function to calculate total amount (example)
function calculateTotalAmount(cartItems) {
  return cartItems.reduce((total, item) => total + item.price * item.quantity, 0);
}

// Function to send confirmation email (example - using Nodemailer)

async function sendConfirmationEmail(email, orderId, cartItems, shippingAddress) {
  // Configure your email transporter (using your email provider's settings)
  const transporter = nodemailer.createTransport({
    //... your email configuration
  });

  try {
    // Send the email
    await transporter.sendMail({
      from: 'your_email@example.com',
      to: email,
      subject: 'Order Confirmation',
      html: `
        <p>Thank you for your order!</p>
        <p>Your order ID is: ${orderId}</p>
        {/* Include order details, shipping address, etc. */}
      `,
    });
    console.log('Confirmation email sent successfully');
  } catch (err) {
    console.error('Error sending confirmation email:', err);
  }
}

// Save order to database
async function saveOrder(orderData) {
  console.log('Saving order with data:', JSON.stringify(orderData, null, 2));
  const { txnid, mihpayid, firstname, email, phone, address, amount, items, payment_status } = orderData;
  const client = await db.connect();
  
  try {
    await client.query('BEGIN');
    console.log('Started transaction');

    // Insert order
    const orderQuery = `
      INSERT INTO orders (
        payment_status, total_amount, shipping_address, 
        transaction_id, payment_id, customer_name, customer_email, customer_phone
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING order_id`;
    
    const orderValues = [
      payment_status || 'Completed',
      amount,
      JSON.stringify(address),
      txnid,
      mihpayid,
      firstname,
      email,
      phone
    ];

    console.log('Executing order query with values:', JSON.stringify(orderValues, null, 2));
    const orderResult = await client.query(orderQuery, orderValues);
    const orderId = orderResult.rows[0].order_id;
    console.log('Order created with ID:', orderId);

    // Insert order items
    console.log('Inserting order items:', JSON.stringify(items, null, 2));
    for (const item of items) {
      const itemQuery = `
        INSERT INTO order_items (order_id, book_id, quantity, price)
        VALUES ($1, $2, $3, $4)`;
      await client.query(itemQuery, [orderId, item.id, item.quantity, item.price]);
      console.log('Inserted item:', item.id);
    }

    await client.query('COMMIT');
    console.log('Transaction committed successfully');
    return orderId;
  } catch (error) {
    console.error('Error saving order:', error);
    console.error('Error details:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
    if (error.detail) {
      console.error('Error detail:', error.detail);
    }
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Get all orders for admin panel
app.get('/api/admin/orders', checkAdminCode, async (req, res) => {
  console.log('Fetching orders with admin code:', req.query.adminCode);
  try {
    const query = `
      SELECT 
        o.*,
        json_agg(
          json_build_object(
            'id', oi.book_id,
            'title', b.title,
            'quantity', oi.quantity,
            'price', oi.price
          )
        ) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.order_id = oi.order_id
      LEFT JOIN books b ON oi.book_id = b.book_id
      GROUP BY 
        o.order_id, 
        o.payment_status,
        o.total_amount,
        o.shipping_address,
        o.transaction_id,
        o.payment_id,
        o.customer_name,
        o.customer_email,
        o.customer_phone,
        o.created_at
      ORDER BY o.created_at DESC`;

    console.log('Executing orders query');
    const result = await db.query(query);
    console.log('Orders query result:', JSON.stringify(result.rows, null, 2));
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching orders:', error);
    console.error('Error details:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
    if (error.detail) {
      console.error('Error detail:', error.detail);
    }
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Send Order Confirmation Email
async function sendOrderConfirmationEmail(orderDetails) {
  const {
    email,
    name,
    orderId,
    txnId,
    paymentId,
    amount,
    items,
    shippingAddress
  } = orderDetails;

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  // Format items for email
  const itemsList = items.map(item => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #ddd;">${item.title}</td>
      <td style="padding: 10px; border-bottom: 1px solid #ddd;">${item.quantity}</td>
      <td style="padding: 10px; border-bottom: 1px solid #ddd;">₹${item.price.toFixed(2)}</td>
      <td style="padding: 10px; border-bottom: 1px solid #ddd;">₹${(item.price * item.quantity).toFixed(2)}</td>
    </tr>
  `).join('');

  // Format shipping address
  const address = JSON.parse(shippingAddress);
  const formattedAddress = `
    ${address.street}
    ${address.city}, ${address.state}
    ${address.postalCode}
  `;

  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Order Confirmation</h2>
      <p>Dear ${name},</p>
      <p>Thank you for your order! Your order has been successfully placed and payment has been received.</p>
      
      <div style="margin: 20px 0;">
        <h3>Order Details:</h3>
        <p>Order ID: ${orderId}</p>
        <p>Transaction ID: ${txnId}</p>
        <p>Payment ID: ${paymentId}</p>
      </div>

      <div style="margin: 20px 0;">
        <h3>Items Ordered:</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background-color: #f8f9fa;">
              <th style="padding: 10px; text-align: left;">Item</th>
              <th style="padding: 10px; text-align: left;">Quantity</th>
              <th style="padding: 10px; text-align: left;">Price</th>
              <th style="padding: 10px; text-align: left;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsList}
          </tbody>
        </table>
      </div>

      <div style="margin: 20px 0;">
        <h3>Shipping Address:</h3>
        <p style="white-space: pre-line;">${formattedAddress}</p>
      </div>

      <div style="margin: 20px 0;">
        <h3>Order Summary:</h3>
        <p>Total Amount: ₹${amount.toFixed(2)}</p>
      </div>

      <p>If you have any questions about your order, please contact our customer support.</p>
      
      <p>Thank you for shopping with Books Plaza!</p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: email,
      subject: `Order Confirmation - Order #${orderId}`,
      html: emailHtml
    });
    console.log('Order confirmation email sent successfully');
  } catch (error) {
    console.error('Error sending order confirmation email:', error);
    throw error;
  }
}

// Toggle order status
app.put('/api/admin/orders/:orderId/status', checkAdminCode, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    const result = await db.query(
      'UPDATE orders SET payment_status = $1 WHERE order_id = $2 RETURNING *',
      [status, orderId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});