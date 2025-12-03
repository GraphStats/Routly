import { Routly, bodyParser } from '../src/index';

/**
 * This example demonstrates the three different API styles available in Routly
 */

const app = new Routly();

// Middleware
app.use('/', bodyParser.json());

console.log('=== Routly API Styles Demo ===\n');

// ============================================
// Style 1: Modern Map-Style API
// ============================================
console.log('✨ Style 1: Modern Map-Style');
app.routes({
    'GET /': async (req, res) => {
        res.json({
            message: 'Hello from Routly!',
            style: 'Modern Map-Style',
            example: "app.routes({ 'GET /': handler })"
        });
    },

    'GET /about': async (req, res) => {
        res.json({
            page: 'About',
            framework: 'Routly',
            description: 'A modern web framework with multiple API styles'
        });
    }
});

// ============================================
// Style 2: Builder-Style API (Fluent)
// ============================================
console.log('✨ Style 2: Builder-Style (Fluent API)');
app.route('/users')
    .get(async (req, res) => {
        res.json({
            users: ['Alice', 'Bob', 'Charlie'],
            style: 'Builder-Style',
            example: "app.route('/users').get(handler).post(handler)"
        });
    })
    .post(async (req, res) => {
        res.status(201).json({
            user: req.body,
            created: true,
            style: 'Builder-Style'
        });
    });

app.route('/products')
    .get(async (req, res) => {
        res.json({ products: ['Product A', 'Product B'] });
    })
    .post(async (req, res) => {
        res.status(201).json({ product: req.body, created: true });
    })
    .delete(async (req, res) => {
        res.json({ deleted: true });
    });

// ============================================
// Style 3: Classic Style (for comparison)
// ============================================
console.log('✨ Style 3: Classic Style (still available)');
app.get('/classic', async (req, res) => {
    res.json({
        message: 'Classic Express-like syntax',
        style: 'Classic',
        example: "app.get('/path', handler)"
    });
});

app.post('/classic', async (req, res) => {
    res.status(201).json({
        data: req.body,
        style: 'Classic'
    });
});

// ============================================
// Start the server (modern alias for listen)
// ============================================
console.log('\n🚀 Starting server...\n');

app.start(3000, () => {
    console.log('✅ Server running on http://localhost:3000');
    console.log('\nTry these endpoints:');
    console.log('  GET  http://localhost:3000/');
    console.log('  GET  http://localhost:3000/about');
    console.log('  GET  http://localhost:3000/users');
    console.log('  POST http://localhost:3000/users');
    console.log('  GET  http://localhost:3000/products');
    console.log('  GET  http://localhost:3000/classic');
    console.log('\n💡 All three API styles work together seamlessly!');
});
