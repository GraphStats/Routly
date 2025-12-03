import {
    Routly,
    bodyParser,
    cors,
    rateLimit,
    cookieParser,
    serveStatic,
    validators,
    asyncHandler,
    createError
} from '../src/index';
import * as path from 'path';

const app = new Routly();

// ============================================
// MIDDLEWARE
// ============================================

// CORS - Allow all origins
app.use('/', cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
}));

// Rate limiting - 100 requests per minute
app.use('/api', rateLimit({
    windowMs: 60000,
    max: 100,
    message: 'Too many requests from this IP, please try again later.',
}));

// Cookie parser
app.use('/', cookieParser());

// Body parsers
app.use('/', bodyParser.json({ limit: 5 * 1024 * 1024 })); // 5MB limit
app.use('/', bodyParser.urlencoded({ limit: 5 * 1024 * 1024 }));

// Static files
app.use('/public', serveStatic(path.join(__dirname, 'public')));

// ============================================
// ROUTES
// ============================================

// Basic routes
app.get('/', (req, res) => {
    res.json({
        message: 'Welcome to Routly Advanced Server!',
        features: [
            'Async/await support',
            'Route groups',
            'Built-in validation',
            'CORS middleware',
            'Rate limiting',
            'Cookie parser',
            'Static file serving',
            'Error handling',
        ]
    });
});

// Route with validation
app.post('/users',
    validators.body({
        name: { type: 'string', required: true, min: 3, max: 50 },
        email: { type: 'email', required: true },
        age: { type: 'number', min: 18, max: 120 },
    }),
    (req, res) => {
        res.status(201).json({
            message: 'User created successfully',
            user: req.body
        });
    }
);

// Async route with error handling
app.get('/async-example', asyncHandler(async (req, res) => {
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 100));

    res.json({ message: 'Async operation completed!' });
}));

// Route with custom error
app.get('/error-example', (req, res) => {
    throw createError.badRequest('This is a custom error example');
});

// Cookie example
app.get('/set-cookie', (req, res) => {
    res.cookie('user', 'john_doe', {
        maxAge: 3600000, // 1 hour
        httpOnly: true,
        path: '/'
    });
    res.json({ message: 'Cookie set!' });
});

app.get('/get-cookie', (req, res) => {
    res.json({
        message: 'Your cookies',
        cookies: req.cookies
    });
});

// Redirect example
app.get('/redirect', (req, res) => {
    res.redirect('/');
});

// ============================================
// ROUTE GROUPS
// ============================================

app.group('/api/v1', (group) => {
    // Middleware for this group
    group.use('/', (req, res, next) => {
        console.log('API v1 middleware');
        next();
    });

    // Routes in the group
    group.get('/users', (req, res) => {
        res.json({ users: ['Alice', 'Bob', 'Charlie'] });
    });

    group.get('/users/:id',
        validators.params({
            id: { type: 'number', required: true }
        }),
        (req, res) => {
            res.json({ userId: req.params.id });
        }
    );

    group.post('/users',
        validators.body({
            name: { type: 'string', required: true }
        }),
        (req, res) => {
            res.status(201).json({
                message: 'User created in API v1',
                user: req.body
            });
        }
    );

    group.put('/users/:id', (req, res) => {
        res.json({
            message: 'User updated',
            userId: req.params.id,
            data: req.body
        });
    });

    group.delete('/users/:id', (req, res) => {
        res.json({
            message: 'User deleted',
            userId: req.params.id
        });
    });
});

// ============================================
// START SERVER
// ============================================

const PORT = 3000;

app.listen(PORT, () => {
    console.log(`🚀 Routly Advanced Server running on http://localhost:${PORT}`);
    console.log(`\nAvailable endpoints:`);
    console.log(`  GET  /                    - Welcome message`);
    console.log(`  POST /users               - Create user (with validation)`);
    console.log(`  GET  /async-example       - Async handler example`);
    console.log(`  GET  /error-example       - Error handling example`);
    console.log(`  GET  /set-cookie          - Set cookie example`);
    console.log(`  GET  /get-cookie          - Get cookies example`);
    console.log(`  GET  /redirect            - Redirect example`);
    console.log(`  GET  /api/v1/users        - API v1 users list`);
    console.log(`  GET  /api/v1/users/:id    - API v1 get user`);
    console.log(`  POST /api/v1/users        - API v1 create user`);
    console.log(`  PUT  /api/v1/users/:id    - API v1 update user`);
    console.log(`  DELETE /api/v1/users/:id  - API v1 delete user`);
});
