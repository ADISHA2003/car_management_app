import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../db/index.js';

const router = express.Router();

// Helper function for input validation
const validateInput = (data, fields) => {
    const errors = {};
    fields.forEach(field => {
        if (!data[field] || data[field].trim() === '') {
            errors[field] = `${field.charAt(0).toUpperCase() + field.slice(1)} is required`;
        }
    });
    return errors;

}


router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        const errors = validateInput(req.body, ['username', 'email', 'password']);
        if (Object.keys(errors).length > 0) {
            return res.status(400).json({ error: errors })
        }


        const existingUser = await query('SELECT * FROM users WHERE email = $1 OR username = $2', [email, username]);

        if (existingUser.rows.length > 0) {
            if (existingUser.rows[0].email === email)
                return res.status(400).json({ error: 'Email is already registered' });
            else
                return res.status(400).json({ error: 'Username is taken.' });
        }



        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await query(
            'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id, username, email',
            [username, email, hashedPassword]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error("Error during registration:", error); // Log the full error object
        res.status(500).json({ error: 'Internal server error' }); // Generic error for security
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const errors = validateInput(req.body, ['email', 'password']);
        if (Object.keys(errors).length > 0) {
            return res.status(400).json({ error: errors })
        }

        const result = await query('SELECT * FROM users WHERE email = $1', [email]);
        const user = result.rows[0];

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }


        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid)
            return res.status(401).json({ error: 'Invalid credentials' });


        const token = jwt.sign(
            { id: user.id, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email
            }
        });

    } catch (error) {
        console.error("Error during login:", error);
        res.status(500).json({ error: 'Internal Server Error during login' });
    }
});

export default router;

