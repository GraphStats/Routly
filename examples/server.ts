import { Routly, bodyParser } from '../src/index';

const app = new Routly();

// Middleware example
app.use('/api', (req, res, next) => {
    console.log('API Middleware hit:', req.url);
    next();
});

// Body Parser Middleware
app.use('/data', bodyParser.json());

app.get('/', (req, res) => {
    res.send('Hello Routly!');
});

app.get('/json', (req, res) => {
    res.json({ message: 'Hello JSON', success: true, query: req.query });
});

app.post('/data', (req, res) => {
    res.status(201).json({ message: 'Data received', body: req.body });
});

app.get('/users/:id', (req, res) => {
    res.json({ userId: req.params.id });
});

app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});
