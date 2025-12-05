# Routly

A modern, feature-rich web framework for Node.js with TypeScript support. Unlike Express, Routly comes with batteries included - validation, CORS, rate limiting, and more are built right in.

![TryHard Dev](https://img.shields.io/badge/dev-mode--try--hard-red)

## ✨ Features

- 🚀 **Lightweight**: Built on Node.js native `http` module
- 🛣️ **Advanced Routing**: Support for all HTTP methods, route parameters, and route groups
- ⚡ **Async/Await Native**: First-class support for async handlers
- 🔒 **Built-in Validation**: No need for external validation libraries
- 🌐 **CORS Middleware**: Integrated CORS support
- 🛡️ **Rate Limiting**: Protect your API from abuse
- 🍪 **Cookie Parser**: Parse and set cookies easily
- 📁 **Static Files**: Serve static files with ETag support
- 📦 **Body Parsing**: JSON and URL-encoded body parsing
- 🎯 **Route Groups**: Organize routes with prefixes and shared middleware
- 🔧 **Error Handling**: Centralized error handling with custom errors
- 📝 **TypeScript**: Full TypeScript support with complete type definitions

## 📦 Installation

```bash
npm install routly
```

## 🚀 Quick Start

```typescript
import { Routly, bodyParser } from 'routly';

const app = new Routly();

// Middleware
app.use('/', bodyParser.json());

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Hello Routly!' });
});

app.post('/users', (req, res) => {
  res.status(201).json({ user: req.body });
});

// Start server
app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
```

## 📚 Documentation

### HTTP Methods

Routly supports all standard HTTP methods:

```typescript
app.get('/users', handler);
app.post('/users', handler);
app.put('/users/:id', handler);
app.patch('/users/:id', handler);
app.delete('/users/:id', handler);
app.options('/users', handler);
```

### Route Groups

Organize routes with shared prefixes and middleware:

```typescript
app.group('/api/v1', (group) => {
  // Middleware for this group
  group.use('/', authMiddleware);
  
  // Routes
  group.get('/users', getUsers);
  group.post('/users', createUser);
  group.get('/users/:id', getUser);
});
```

### Built-in Validation

Validate request data without external libraries:

```typescript
import { validators } from 'routly';

app.post('/users', validators.body({
  name: { type: 'string', required: true, min: 3, max: 50 },
  email: { type: 'email', required: true },
  age: { type: 'number', min: 18, max: 120 },
}), (req, res) => {
  res.json({ user: req.body });
});
```

**Validation Rules:**
- `type`: 'string' | 'number' | 'boolean' | 'email' | 'url' | 'array' | 'object'
- `required`: boolean
- `min`: minimum length/value
- `max`: maximum length/value
- `pattern`: RegExp
- `custom`: custom validation function
- `message`: custom error message

### CORS Middleware

```typescript
import { cors } from 'routly';

app.use('/', cors({
  origin: '*', // or array of origins, or function
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));
```

### Rate Limiting

```typescript
import { rateLimit } from 'routly';

app.use('/api', rateLimit({
  windowMs: 60000, // 1 minute
  max: 100, // 100 requests per minute
  message: 'Too many requests',
}));
```

### Cookie Parser

```typescript
import { cookieParser } from 'routly';

app.use('/', cookieParser());

app.get('/set-cookie', (req, res) => {
  res.cookie('user', 'john', { 
    maxAge: 3600000, 
    httpOnly: true 
  });
  res.json({ message: 'Cookie set' });
});

app.get('/get-cookie', (req, res) => {
  res.json({ cookies: req.cookies });
});
```

### Static Files

```typescript
import { serveStatic } from 'routly';
import * as path from 'path';

app.use('/public', serveStatic(path.join(__dirname, 'public'), {
  maxAge: 86400, // 1 day cache
  etag: true,
}));
```

### Body Parsers

```typescript
import { bodyParser } from 'routly';

// JSON parser
app.use('/', bodyParser.json({ limit: 5 * 1024 * 1024 })); // 5MB limit

// URL-encoded parser
app.use('/', bodyParser.urlencoded({ limit: 5 * 1024 * 1024 }));
```

### Error Handling

```typescript
import { errorHandler, asyncHandler, createError } from 'routly';

// Async route with automatic error handling
app.get('/async', asyncHandler(async (req, res) => {
  const data = await fetchData();
  res.json(data);
}));

// Throw custom errors
app.get('/error', (req, res) => {
  throw createError.badRequest('Invalid input');
});

// Error handler middleware (must be last)
app.use('/', errorHandler({ 
  log: true,
  showStack: process.env.NODE_ENV !== 'production'
}));
```

**Available error creators:**
- `createError.badRequest(message)` - 400
- `createError.unauthorized(message)` - 401
- `createError.forbidden(message)` - 403
- `createError.notFound(message)` - 404
- `createError.conflict(message)` - 409
- `createError.internal(message)` - 500

### Request Object

```typescript
interface Request {
  query: { [key: string]: string | string[] };
  params: { [key: string]: string };
  body?: any;
  cookies?: { [key: string]: string };
  ip?: string;
  
  // Helper methods
  is(type: string): boolean;
  get(header: string): string | string[] | undefined;
  accepts(...types: string[]): string | false;
}
```

### Response Object

```typescript
interface Response {
  status(code: number): this;
  json(body: any): void;
  send(body: string | Buffer): void;
  redirect(url: string, status?: number): void;
  cookie(name: string, value: string, options?: CookieOptions): this;
  sendFile(path: string): void;
}
```

## 🎯 Why Routly over Express?

| Feature | Routly | Express |
|---------|--------|---------|
| TypeScript Native | ✅ Built-in | ❌ Needs @types |
| Validation | ✅ Built-in | ❌ Needs express-validator |
| CORS | ✅ Built-in | ❌ Needs cors package |
| Rate Limiting | ✅ Built-in | ❌ Needs express-rate-limit |
| Cookie Parser | ✅ Built-in | ❌ Needs cookie-parser |
| Async/Await | ✅ Native support | ⚠️ Needs wrappers |
| Route Groups | ✅ Built-in | ❌ Manual setup |
| Modern API | ✅ Clean & intuitive | ⚠️ Legacy patterns |

## 📖 Examples

Check out the [examples](https://github.com/GraphStats/Routly/tree/main/examples) directory for complete working examples:

- [basic-server.ts](https://github.com/GraphStats/Routly/tree/main/examples/server.ts) - Basic server setup
- [advanced-server.ts](https://github.com/GraphStats/Routly/tree/main/examples/advanced-server.ts) - All features showcase

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

ISC

## 🔗 Links

- [GitHub Repository](https://github.com/yourusername/routly)
- [npm Package](https://www.npmjs.com/package/routly)
