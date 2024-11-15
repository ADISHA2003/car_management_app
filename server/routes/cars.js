import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { auth } from '../middleware/auth.js';
import { query } from '../db/index.js';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configure multer for image upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../../uploads/'));
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5000000 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Not an image! Please upload an image.'));
    }
  }
});

/**
 * @swagger
 * /api/cars:
 *   post:
 *     summary: Create a new car listing
 *     tags: [Cars]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', auth, upload.array('images', 10), async (req, res) => {
  try {
    const { title, description, car_type, company, dealer, tags } = req.body;
    const images = req.files;
    
    // Start transaction
    await query('BEGIN');
    
    // Insert car
    const carResult = await query(
      'INSERT INTO cars (user_id, title, description, car_type, company, dealer) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [req.user.id, title, description, car_type, company, dealer]
    );
    
    const carId = carResult.rows[0].id;
    
    // Insert images
    for (const image of images) {
      await query(
        'INSERT INTO car_images (car_id, image_url) VALUES ($1, $2)',
        [carId, `/uploads/${image.filename}`]
      );
    }
    
    // Insert tags
    const tagArray = JSON.parse(tags);
    for (const tag of tagArray) {
      await query(
        'INSERT INTO car_tags (car_id, tag) VALUES ($1, $2)',
        [carId, tag]
      );
    }
    
    await query('COMMIT');
    
    res.status(201).json({ message: 'Car created successfully', carId });
  } catch (error) {
    await query('ROLLBACK');
    res.status(400).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/cars:
 *   get:
 *     summary: Get all cars for the authenticated user
 *     tags: [Cars]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', auth, async (req, res) => {
  try {
    const result = await query(`
      SELECT c.*, 
             array_agg(DISTINCT ci.image_url) as images,
             array_agg(DISTINCT ct.tag) as tags
      FROM cars c
      LEFT JOIN car_images ci ON c.id = ci.car_id
      LEFT JOIN car_tags ct ON c.id = ct.car_id
      WHERE c.user_id = $1
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `, [req.user.id]);
    
    res.json(result.rows);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/cars/search:
 *   get:
 *     summary: Search cars by keyword
 *     tags: [Cars]
 *     security:
 *       - bearerAuth: []
 */
router.get('/search', auth, async (req, res) => {
  try {
    const { keyword } = req.query;
    
    const result = await query(`
      SELECT DISTINCT c.*, 
             array_agg(DISTINCT ci.image_url) as images,
             array_agg(DISTINCT ct.tag) as tags
      FROM cars c
      LEFT JOIN car_images ci ON c.id = ci.car_id
      LEFT JOIN car_tags ct ON c.id = ct.car_id
      WHERE c.user_id = $1
      AND (
        c.title ILIKE $2 OR
        c.description ILIKE $2 OR
        c.car_type ILIKE $2 OR
        c.company ILIKE $2 OR
        c.dealer ILIKE $2 OR
        ct.tag ILIKE $2
      )
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `, [req.user.id, `%${keyword}%`]);
    
    res.json(result.rows);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/cars/{id}:
 *   get:
 *     summary: Get a specific car by ID
 *     tags: [Cars]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await query(`
      SELECT c.*, 
             array_agg(DISTINCT ci.image_url) as images,
             array_agg(DISTINCT ct.tag) as tags
      FROM cars c
      LEFT JOIN car_images ci ON c.id = ci.car_id
      LEFT JOIN car_tags ct ON c.id = ct.car_id
      WHERE c.id = $1 AND c.user_id = $2
      GROUP BY c.id
    `, [req.params.id, req.user.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Car not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/cars/{id}:
 *   put:
 *     summary: Update a car
 *     tags: [Cars]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:id', auth, upload.array('images', 10), async (req, res) => {
  try {
    const { title, description, car_type, company, dealer, tags } = req.body;
    const images = req.files;
    
    await query('BEGIN');
    
    // Update car details
    await query(`
      UPDATE cars 
      SET title = $1, description = $2, car_type = $3, company = $4, dealer = $5
      WHERE id = $6 AND user_id = $7
    `, [title, description, car_type, company, dealer, req.params.id, req.user.id]);
    
    // Handle new images if provided
    if (images && images.length > 0) {
      await query('DELETE FROM car_images WHERE car_id = $1', [req.params.id]);
      
      for (const image of images) {
        await query(
          'INSERT INTO car_images (car_id, image_url) VALUES ($1, $2)',
          [req.params.id, `/uploads/${image.filename}`]
        );
      }
    }
    
    // Update tags
    if (tags) {
      await query('DELETE FROM car_tags WHERE car_id = $1', [req.params.id]);
      
      const tagArray = JSON.parse(tags);
      for (const tag of tagArray) {
        await query(
          'INSERT INTO car_tags (car_id, tag) VALUES ($1, $2)',
          [req.params.id, tag]
        );
      }
    }
    
    await query('COMMIT');
    
    res.json({ message: 'Car updated successfully' });
  } catch (error) {
    await query('ROLLBACK');
    res.status(400).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/cars/{id}:
 *   delete:
 *     summary: Delete a car
 *     tags: [Cars]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await query(
      'DELETE FROM cars WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Car not found' });
    }
    
    res.json({ message: 'Car deleted successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;