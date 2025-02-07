const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const axios = require('axios');
const { body, validationResult } = require('express-validator');
const app = express();
const port = process.env.PORT || 3001;
const db = require('./db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
// const { upload, checkAdminCode } = require('./middleware');

// Load environment variables
require('dotenv').config();

// Validate PhonePe configuration
if (!process.env.PHONEPE_MERCHANT_ID || !process.env.PHONEPE_SALT_KEY || !process.env.PHONEPE_SALT_INDEX) {
  console.error('PhonePe credentials are missing');
  process.exit(1);
}



const API_URL = process.env.API_URL || 'http://localhost:3001';

// CORS configuration
app.use(cors({
    origin: true,
    credentials: true
}));

app.use(express.json());

const MemoryStore = require('memorystore')(session);

app.use(
  session({
    store: new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    }),
    secret: process.env.SESSION_SECRET || 'your_session_secret',
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      secure: false, // Set to true in production with HTTPS
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

const { uploadToCloudinary } = require('./config/cloudinary');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, '/tmp');
  },
  filename: (req, file, cb) => {
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
app.post('/api/admin/books', checkAdminCode, upload.single('image'), [
  body('title').notEmpty().trim().escape().withMessage('Title is required'),
  body('author').notEmpty().trim().escape().withMessage('Author is required'),
  body('description').notEmpty().trim().escape().withMessage('Description is required'),
  body('price').isFloat({ min: 0.01 }).withMessage('Price must be a positive number'),
  body('genre').notEmpty().trim().escape().withMessage('Genre is required'),
  body('language').notEmpty().trim().escape().withMessage('Language is required'),
  body('isbn').notEmpty().trim().escape().withMessage('ISBN is required'),
  body('publisher').notEmpty().trim().escape().withMessage('Publisher is required'),
  body('publishDate').notEmpty().trim().escape().withMessage('Publish date is required'),
  body('pages').isInt({ min: 1 }).withMessage('Pages must be a positive integer'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { title, author, description, price, genre, language, isbn, publisher, publishDate, pages } = req.body;
    console.log('Request body:', { title, author, description, price, genre, language, isbn, publisher, publishDate, pages });
    
    let imageUrl = null;
    if (req.file) {
      try {
        imageUrl = await uploadToCloudinary(req.file);
        if (!imageUrl) {
          throw new Error('Failed to get image URL from Cloudinary');
        }
        console.log('Cloudinary upload successful, image URL:', imageUrl);
      } catch (uploadError) {
        console.error('Error uploading to Cloudinary:', uploadError);
        return res.status(500).json({ error: 'Failed to upload image' });
      }
    }

    const result = await db.query(
      'INSERT INTO books (title, author, description, price, genre, language, isbn, publisher, publishdate, pages, image_url, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *',
      [title, author, description, price, genre, language, isbn, publisher, publishDate, pages, imageUrl, true]
    );

    console.log('Book created successfully:', result.rows[0]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating book:', {
      error: err.message,
      stack: err.stack,
      code: err.code
    });
    if (err.code === '23505') {
      return res.status(400).json({ error: 'A book with that title already exists' });
    }
    res.status(500).json({ error: 'Error creating book: ' + err.message });
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

    const books = booksResult.rows;

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
  body('isbn').optional().trim().escape(),
  body('publisher').optional().trim().escape(),
  body('publishDate').optional().trim().escape(),
  body('pages').optional().isInt({ min: 1 }),
], async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      author,
      description,
      price,
      genre,
      language,
      isbn,
      publisher,
      publishDate,
      pages
    } = req.body;
    
    let imageUrl = undefined;
    if (req.file) {
      imageUrl = await uploadToCloudinary(req.file);
      console.log('Cloudinary upload completed for update, image URL:', imageUrl);
    }

    const updateFields = ['title', 'author', 'description', 'price', 'genre', 'language', 'isbn', 'publisher', 'publishdate', 'pages'];
    const values = [title, author, description, price, genre, language, isbn, publisher, publishDate, pages];
    
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
    // Check if the book exists
    const bookResult = await db.query('SELECT * FROM books WHERE book_id = $1', [bookId]);
    if (bookResult.rows.length === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }

    // Implement soft delete by updating deleted_at timestamp
    await db.query(
      'UPDATE books SET deleted_at = CURRENT_TIMESTAMP, is_active = false WHERE book_id = $1',
      [bookId]
    );

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
      image_url: book.image_url // Cloudinary URL is already stored in the database
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
    const {
      title,
      author,
      description,
      price,
      genre,
      language,
      isbn,
      publisher,
      publishDate,
      pages
    } = req.body;
    
    // Check if the book exists
    const existingBook = await db.query('SELECT * FROM books WHERE book_id = $1', [id]);
    if (existingBook.rows.length === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }

    let imageUrl = existingBook.rows[0].image_url;
    
    // If a new image is uploaded, update the image_url using Cloudinary
    if (req.file) {
      imageUrl = await uploadToCloudinary(req.file);
      console.log('Cloudinary upload completed for update, image URL:', imageUrl);
    }

    const result = await db.query(
      'UPDATE books SET title = $1, author = $2, description = $3, price = $4, genre = $5, language = $6, isbn = $7, publisher = $8, publishdate = $9, pages = $10, image_url = $11 WHERE book_id = $12 RETURNING *',
      [title, author, description, price, genre, language, isbn, publisher, publishDate, pages, imageUrl, id]
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
      image_url: result.rows[0].image_url // Use Cloudinary URL directly
    };

    res.json(book);
  } catch (err) {
    console.error('Error fetching book details:', err);
    res.status(500).json({ error: 'Error fetching book details' });
  }
});

// Create order endpoint
app.post('/api/orders', async (req, res) => {
    try {
        console.log('Creating order with data:', req.body);
        const { 
            items, 
            shipping_address, 
            customer_name, 
            customer_email, 
            customer_phone,
            total_amount 
        } = req.body;

        // Validate required fields
        if (!customer_email || !customer_name || !customer_phone) {
            return res.status(400).json({
                error: 'Missing required customer details',
                details: 'Email, name, and phone are required'
            });
        }

        // Generate a unique transaction ID
        const transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Begin transaction
        await db.query('BEGIN');

        // Insert order with all required fields
        const orderQuery = `
            INSERT INTO orders (
                payment_status,
                total_amount,
                shipping_address,
                transaction_id,
                customer_name,
                customer_email,
                customer_phone
            ) 
            VALUES ($1, $2, $3, $4, $5, $6, $7) 
            RETURNING *
        `;

        const orderValues = [
            'pending',                    // payment_status
            total_amount,                 // total_amount
            JSON.stringify(shipping_address), // shipping_address as JSONB
            transactionId,               // transaction_id
            customer_name,                // customer_name
            customer_email,               // customer_email
            customer_phone                // customer_phone
        ];

        console.log('Executing order query with values:', orderValues);

        const orderResult = await db.query(orderQuery, orderValues);
        const order = orderResult.rows[0];
        
        console.log('Created order:', order);

        // Insert order items
        for (const item of items) {
            await db.query(
                `INSERT INTO order_items (
                    order_id,
                    book_id,
                    quantity,
                    price
                ) VALUES ($1, $2, $3, $4)`,
                [order.order_id, item.book_id, item.quantity, parseFloat(item.price)]
            );
        }

        await db.query('COMMIT');

        // Return the complete order data
        const completeOrderQuery = `
            SELECT o.*,
                json_agg(
                    json_build_object(
                        'book_id', oi.book_id,
                        'quantity', oi.quantity,
                        'price', oi.price,
                        'title', b.title
                    )
                ) as order_items
            FROM orders o
            LEFT JOIN order_items oi ON o.order_id = oi.order_id
            LEFT JOIN books b ON oi.book_id = b.book_id
            WHERE o.order_id = $1
            GROUP BY o.order_id`;

        const completeOrder = await db.query(completeOrderQuery, [order.order_id]);
        
        res.json(completeOrder.rows[0]);

    } catch (error) {
        await db.query('ROLLBACK');
        console.error('Error creating order:', error);
        res.status(500).json({ 
            error: 'Failed to create order',
            details: error.message
        });
    }
});

// Debug middleware for sessions
app.use((req, res, next) => {
  console.log('Session Debug:', {
    sessionID: req.sessionID,
    session: req.session
  });
  next();
});




const PAY_PAGE_URL = `${process.env.PHONEPE_API_URL}/pg/v1/pay`;
const VERIFY_STATUS_URL = `${process.env.PHONEPE_API_URL}/pg/v1/status`;
const MERCHANT_ID = process.env.PHONEPE_MERCHANT_ID;
const SALT_KEY = process.env.PHONEPE_SALT_KEY;
const SALT_INDEX = process.env.PHONEPE_SALT_INDEX;

// Enhanced X-VERIFY calculation
const calculateXVerify = (base64Payload, path, saltKey, saltIndex) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const stringToHash = base64Payload + normalizedPath + saltKey;
  console.log('Hash Input:', {
      base64Payload,
      normalizedPath,
      saltKey: saltKey,  // Keep this for debugging
      saltIndex
  });
  return crypto.createHash('sha256').update(stringToHash).digest('hex') + `###${saltIndex}`;
};

// Create Payment Endpoint
app.post('/api/create-payment', async (req, res) => {
  let merchantTransactionId; // Declare outside try block for error handling
  
  try {
      console.log('Environment Config:', {
          MERCHANT_ID: MERCHANT_ID,
          SALT_INDEX,
          PHONEPE_API_URL: process.env.PHONEPE_API_URL,
          CALLBACK_URL: `${process.env.BACKEND_URL}/api/payment/phonepe-callback`
      });

      // Validate required fields
      const requiredFields = ['orderId', 'amount', 'customerName', 'customerEmail', 'customerPhone'];
      const missingFields = requiredFields.filter(field => !req.body[field]);
      if (missingFields.length) {
          return res.status(400).json({ 
              error: 'Missing required fields',
              missing: missingFields 
          });
      }

      // Sanitize inputs
      const { orderId, amount, customerPhone } = req.body;
      const sanitizedOrderId = String(orderId).replace(/\D/g, '').padStart(4, '0');
      const sanitizedPhone = String(customerPhone).replace(/\D/g, '');

      // Validations
      if (isNaN(Number(amount)) || Number(amount) <= 0) {
          return res.status(400).json({ error: 'Invalid amount value' });
      }
      if (sanitizedPhone.length < 10) {
          return res.status(400).json({ error: 'Invalid phone number' });
      }

      // Generate transaction ID
      merchantTransactionId = `MT${Date.now()}_${sanitizedOrderId.slice(-10)}`;

      // Construct payload
      const payload = {
          merchantId: MERCHANT_ID,
          merchantTransactionId,
          merchantUserId: `CUST_${sanitizedPhone.slice(-6)}`,
          amount: Math.round(Number(amount) * 100),
          redirectUrl: `${process.env.BACKEND_URL}/payment-success`,
          redirectMode: "REDIRECT",
          callbackUrl: `https://2be9-36-255-84-98.ngrok-free.app/api/payment/phonepe-callback`,
          mobileNumber: sanitizedPhone.slice(-10),
          paymentInstrument: { type: 'PAY_PAGE' }
      };

      // Generate X-VERIFY
      const payloadString = JSON.stringify(payload);
      const base64Payload = Buffer.from(payloadString).toString('base64');
      const xVerify = calculateXVerify(base64Payload, '/pg/v1/pay', SALT_KEY, SALT_INDEX);

      console.log('Payment Request:', {
          headers: { 'X-VERIFY': xVerify },
          payload: base64Payload
      });

      // PhonePe API Call
      const response = await axios.post(PAY_PAGE_URL, 
          { request: base64Payload },
          { 
              headers: { 
                  'X-VERIFY': xVerify, 
                  'Content-Type': 'application/json',
                  'X-MERCHANT-ID': MERCHANT_ID 
              },
              timeout: 10000 
          }
      );

      // Handle success response
      if (response.data?.success && response.data?.data?.instrumentResponse?.redirectInfo?.url) {
          await db.query(
              `UPDATE orders 
               SET transaction_id = $1, 
                   payment_status = 'pending', 
                   payment_initiated_at = NOW()
               WHERE order_id = $2`,
              [merchantTransactionId, sanitizedOrderId]
          );

          return res.json({
              success: true,
              redirectUrl: response.data.data.instrumentResponse.redirectInfo.url,
              transactionId: merchantTransactionId,
              amount: payload.amount / 100
          });
      }

      // Handle PhonePe errors
      const errorMessage = response.data?.message || 'Payment gateway error';
      console.error('PhonePe API Error:', {
          status: response.status,
          data: response.data
      });
      throw new Error(errorMessage);

  } catch (error) {
      console.error('Payment Processing Error:', {
          message: error.message,
          stack: error.stack,
          transactionId: merchantTransactionId || 'N/A'
      });

      return res.status(500).json({ 
          success: false,
          error: 'Payment processing failed',
          details: error.response?.data || error.message,
          transactionId: merchantTransactionId || 'N/A'
      });
  }
});

// Verify Status Endpoint
app.post('/api/payment/verify-status', async (req, res) => {
    try {
        const { merchantTransactionId } = req.body;
        if (!merchantTransactionId) {
            return res.status(400).json({ error: 'Transaction ID required' });
        }

        const path = `/pg/v1/status/${MERCHANT_ID}/${merchantTransactionId}`;
        const xVerify = calculateXVerify('', path, SALT_KEY, SALT_INDEX);

        console.log('Status Check:', {
            headers: { 'X-VERIFY': xVerify },
            path
        });
        
        const response = await axios.get(
            `${VERIFY_STATUS_URL}/${MERCHANT_ID}/${merchantTransactionId}`,
            { 
                headers: { 
                    'X-VERIFY': xVerify, 
                    'Content-Type': 'application/json',
                    'X-MERCHANT-ID': MERCHANT_ID 
                },
                timeout: 10000 
            }
        );

        const status = response.data?.data?.state || 'PENDING';
        await db.query(
            'UPDATE orders SET payment_status = $1 WHERE transaction_id = $2',
            [status.toLowerCase(), merchantTransactionId]
        );

        res.json({ 
            status,
            amount: response.data?.data?.amount / 100 || 0,
            transactionId: merchantTransactionId
        });

    } catch (error) {
        console.error('Status Check Error:', {
            message: error.message,
            stack: error.stack
        });
        res.status(500).json({
            success: false,
            error: 'Status check failed',
            details: error.response?.data || error.message
        });
    }
});
app.post('/api/payment/phonepe-callback', async (req, res) => {
  try {
    const saltKey = process.env.PHONEPE_SALT_KEY;
    const saltIndex = process.env.PHONEPE_SALT_INDEX || '1';

    // 1. --- Verify the X-VERIFY Header (Callback Version) ---

    // Get the X-VERIFY header from the incoming request.
    const receivedXVerify = req.headers['x-verify'];

    // Check if the X-VERIFY header is present.
    if (!receivedXVerify) {
      console.error('X-VERIFY header missing from callback.');
      return res.status(400).json({ success: false, error: 'X-VERIFY header missing' });
    }

    // Extract the SHA256 hash part from the received X-VERIFY (before ###).
    const receivedHash = receivedXVerify.split('###')[0];

    // Get the base64 encoded response body.  This is the ENTIRE body.
    const encodedPayload = req.body.response;

    if (!encodedPayload) {
        console.error('Request body or response field is missing.');
        return res.status(400).json({ success: false, error: 'Request body missing or invalid' });
    }

    // Construct the string to hash for verification.
    const stringToHash = encodedPayload + saltKey;

    // Calculate the SHA256 hash.
    const calculatedHash = crypto.createHash('sha256').update(stringToHash).digest('hex');

    // Check if the calculated hash matches the received hash.
    if (calculatedHash !== receivedHash) {
      console.error('X-VERIFY mismatch.  Rejecting callback.');
      console.error('Calculated Hash:', calculatedHash);
      console.error('Received Hash  :', receivedHash);
      return res.status(400).json({ success: false, error: 'X-VERIFY mismatch' });
    }

    // 2. --- Decode the PhonePe Response ---

    // Decode the base64 encoded response body.
    const decodedPayload = Buffer.from(encodedPayload, 'base64').toString('utf-8');
    const phonePeResponse = JSON.parse(decodedPayload);

    console.log('Decoded PhonePe Callback Payload:', phonePeResponse);

    // 3. --- Process the Payment Event ---
    if (phonePeResponse.success === true && phonePeResponse.code === 'PAYMENT_SUCCESS') {

        // Extract data from the DECODED response.
        const { merchantId, merchantTransactionId, transactionId, amount } = phonePeResponse.data;
        console.log("Extracted Data", merchantId, merchantTransactionId, transactionId, amount)

      // Find the order in YOUR database using merchantTransactionId.
      const orderResult = await db.query('SELECT * FROM orders WHERE transaction_id = $1', [merchantTransactionId]);

      if (orderResult.rows.length > 0) {
        // Update the order status in YOUR database.
        await db.query(
          'UPDATE orders SET payment_status = $1, payment_id = $2 WHERE transaction_id = $3',
          ['Paid', transactionId, merchantTransactionId] // Use 'Paid', transactionId, and merchantTransactionId
        );
        console.log(`Order ${merchantTransactionId} marked as paid.`);
      }
      else{
        console.log("no order found");
        return res.status(404).json({message: "Order not found"})
      }
    } else {
      // Handle payment failure
      console.error('PhonePe Payment Failed:', phonePeResponse);
      const merchantTransactionId = phonePeResponse.data.merchantTransactionId

      // Find and update the order in YOUR database
      const orderResult = await db.query('SELECT * FROM orders WHERE transaction_id = $1', [merchantTransactionId]);

      if (orderResult.rows.length > 0) {
          await db.query(
            'UPDATE orders SET payment_status = $1 WHERE transaction_id = $2',
            ['Failed', merchantTransactionId]
          );
          console.log(`Order ${merchantTransactionId} marked as failed.`);
      }
      else{
        console.log("no order found");
        return res.status(404).json({message: "Order not found"})
      }
    }

    // 4. --- Respond to PhonePe (ALWAYS 200 OK) ---
    res.status(200).json({ success: true }); // ACKNOWLEDGE receipt

  } catch (error) {
    console.error('Error in PhonePe callback handler:', error);
    // ALWAYS return 200 OK to PhonePe, even on errors.
    res.status(200).json({ success: false });  // Send success: false for your own tracking
  }
});

// Get order details endpoint
app.get('/api/orders/:orderId', async (req, res) => {
    try {
        const orderId = parseInt(req.params.orderId);
        console.log('Fetching details for order:', orderId);

        const orderQuery = `
            SELECT o.*, 
                json_agg(
                    json_build_object(
                        'book_id', oi.book_id,
                        'quantity', oi.quantity,
                        'price', oi.price,
                        'title', b.title
                    )
                ) as order_items
            FROM orders o
            LEFT JOIN order_items oi ON o.order_id = oi.order_id
            LEFT JOIN books b ON oi.book_id = b.book_id
            WHERE o.order_id = $1
            GROUP BY o.order_id`;

        const result = await db.query(orderQuery, [orderId]);

        if (result.rows.length === 0) {
            console.log('No order found with ID:', orderId);
            return res.status(404).json({ error: 'Order not found' });
        }

        console.log('Found order:', result.rows[0]);
        res.json(result.rows[0]);

    } catch (error) {
        console.error('Error fetching order details:', error);
        res.status(500).json({ error: 'Failed to fetch order details' });
    }
});

// Payment success handler (handles both GET and POST)
app.all('/api/payment-success', async (req, res) => {
  try {
    console.log('Payment success received:', {
      method: req.method,
      body: req.body,
      query: req.query,
      // session: req.session
    });

    let savedOrder = null;
    const merchantTransactionId = req.body.merchantTransactionId || req.query.merchantTransactionId;
    console.log('Looking for transaction:', merchantTransactionId);
    console.log('Available sessions:', Object.keys(req.session || {}));

    if (!merchantTransactionId) {
      console.error('No transaction ID found in request');
      return res.status(400).json({ error: 'No transaction ID found' });
    }

    // First check if order already exists in database
    try {
      const existingOrderQuery = 'SELECT * FROM orders WHERE transaction_id = $1';
      const existingOrderResult = await db.query(existingOrderQuery, [merchantTransactionId]);
      
      if (existingOrderResult.rows.length > 0) {
        const order = existingOrderResult.rows[0];
        // Get order items
        const itemsQuery = 'SELECT * FROM order_items WHERE order_id = $1';
        const itemsResult = await db.query(itemsQuery, [order.order_id]);
        
        const completeOrder = {
          orderId: order.order_id,
          transactionId: order.transaction_id,
          paymentId: order.payment_id,
          amount: order.total_amount,
          customerName: order.customer_name,
          customerEmail: order.customer_email,
          customerPhone: order.customer_phone,
          shippingAddress: order.shipping_address,
          items: itemsResult.rows,
          status: order.payment_status,
          createdAt: order.created_at
        };

        if (req.method === 'GET') {
          return res.json({ order: completeOrder });
        } else {
          return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment-success?order=${encodeURIComponent(JSON.stringify(completeOrder))}`);
        }
      }
    } catch (error) {
      console.error('Error checking existing order:', error);
      if (req.method === 'GET') {
        return res.status(500).json({ error: 'Error checking order status' });
      } else {
        return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment-failed?error=Error checking order status`);
      }
    }

    

        if (req.method === 'GET') {
          return res.json({ order: savedOrder });
        } else {
          return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment-success?order=${encodeURIComponent(JSON.stringify(savedOrder))}`);
        }
      } catch (saveError) {
        console.error('Error saving order:', saveError);
        console.error('Error details:', saveError.message);
        console.error('Error stack:', saveError.stack);
        if (req.method === 'GET') {
          return res.status(500).json({ error: 'Error saving order' });
        } else {
          return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment-failed?error=Error saving order`);
        }
      }
    

  

});

// Payment failure handler (handles both GET and POST)
app.all('/api/payment-failed', async (req, res) => {
  console.log('Payment failed:', {
    method: req.method,
    body: req.body,
    query: req.query
  });
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  res.redirect(`${frontendUrl}/payment-failed`);
});



// Function to calculate total amount
function calculateTotalAmount(items) {
  if (!Array.isArray(items)) {
    throw new Error('Items must be an array');
  }
  return items.reduce((total, item) => {
    if (!item.price || !item.quantity) {
      throw new Error('Each item must have price and quantity');
    }
    return total + (item.price * item.quantity);
  }, 0);
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
    throw error;
  }
}

// Save order to database
async function saveOrder(orderData) {
  console.log('Saving order with data:', JSON.stringify(orderData, null, 2));
  const { 
    payment_status,
    total_amount,
    shipping_address,
    transaction_id,
    payment_id,
    customer_name,
    customer_email,
    customer_phone,
    items 
  } = orderData;
  
  console.log('Destructured order data:', {
    payment_status,
    total_amount,
    shipping_address,
    transaction_id,
    payment_id,
    customer_name,
    customer_email,
    customer_phone,
    items
  });

  const client = await db.connect();
  
  try {
    await client.query('BEGIN');
    console.log('Started transaction');

    // Insert order
    const orderQuery = `
      INSERT INTO orders (
        payment_status, total_amount, shipping_address, 
        transaction_id, payment_id, customer_name, customer_email, customer_phone,
        created_at
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      RETURNING order_id, created_at`;
    
    const orderValues = [
      payment_status,
      total_amount,
      JSON.stringify(shipping_address),
      transaction_id,
      payment_id,
      customer_name,
      customer_email,
      customer_phone
    ];

    console.log('Executing order query with values:', JSON.stringify(orderValues, null, 2));
    const orderResult = await client.query(orderQuery, orderValues);
    const order = orderResult.rows[0];
    console.log('Order created:', order);

    // Insert order items
    console.log('Inserting order items:', JSON.stringify(items, null, 2));
    const savedItems = [];
    for (const item of items) {
      const itemQuery = `
        INSERT INTO order_items (order_id, book_id, quantity, price)
        VALUES ($1, $2, $3, $4)
        RETURNING *`;
      console.log('Inserting item with values:', {
        order_id: order.order_id,
        book_id: item.book_id,
        quantity: item.quantity,
        price: item.price
      });
      const itemResult = await client.query(itemQuery, [order.order_id, item.book_id, item.quantity, item.price]);
      savedItems.push(itemResult.rows[0]);
      console.log('Inserted item:', itemResult.rows[0]);
    }

    await client.query('COMMIT');
    console.log('Transaction committed successfully');

    // Return complete order details
    return {
      orderId: order.order_id,
      createdAt: order.created_at,
      transactionId: txnid,
      paymentId: mihpayid,
      amount: amount,
      customerName: firstname,
      customerEmail: email,
      customerPhone: phone,
      shippingAddress: address,
      items: savedItems,
      status: payment_status
    };
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

// Update order status
app.put('/api/orders/:orderId/status', async (req, res) => {
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

// Add body-parser for x-www-form-urlencoded data
app.use(express.urlencoded({ extended: true }));

app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});
