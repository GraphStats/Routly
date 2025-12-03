# Routly

A lightweight, optimized, and simple web framework for Node.js, inspired by Express.

## Features

- 🚀 **Lightweight**: Built on top of Node.js native `http` module.
- 🛣️ **Routing**: Simple and fast router with support for `GET`, `POST`, etc.
- 🔗 **Middleware**: Support for global and path-specific middleware.
- 📦 **Body Parsing**: Built-in JSON body parser.
- 🔍 **Query Parsing**: Automatic query string parsing.
- 🆔 **Route Parameters**: Support for dynamic route parameters (e.g., `/users/:id`).
- 📝 **TypeScript**: Written in TypeScript with full type definitions.

## Installation

```bash
npm install routly
```

## Usage

### Basic Server

```typescript
import { Routly, bodyParser } from 'routly';

const app = new Routly();

// Middleware
app.use('/api', (req, res, next) => {
  console.log('API Middleware hit');
  next();
});

// JSON Body Parser
app.use('/data', bodyParser.json());

// Routes
app.get('/', (req, res) => {
  res.send('Hello Routly!');
});

app.get('/json', (req, res) => {
  res.json({ message: 'Hello JSON', query: req.query });
});

app.post('/data', (req, res) => {
  res.status(201).json({ 
    message: 'Data received', 
    body: req.body 
  });
});

app.get('/users/:id', (req, res) => {
  res.json({ userId: req.params.id });
});

// Start server
app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
```

## API

### `app.use(path?, handler)`
Register middleware. `path` is optional (defaults to `/`).

### `app.get(path, handler)`
Register a GET route.

### `app.post(path, handler)`
Register a POST route.

### `req` (Request)
- `req.query`: Object containing parsed query parameters.
- `req.params`: Object containing parsed route parameters.
- `req.body`: Parsed body (if using body parser).
- `req.path`: The path part of the URL.

### `res` (Response)
- `res.json(data)`: Send a JSON response.
- `res.send(data)`: Send a string or buffer response.
- `res.status(code)`: Set the HTTP status code.

## License

ISC
