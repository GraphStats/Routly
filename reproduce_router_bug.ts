
import { Router } from './src/core/router';

const router = new Router();
router.add('GET', '/users/:id', () => { });

// Access the private stack to check the regex
const stack = (router as any).stack;
const layer = stack[0];

console.log('Path:', layer.path);
console.log('Regex:', layer.regexp);

const testPath = '/users/123';
console.log(`Testing '${testPath}':`, layer.regexp.test(testPath));

const doubleSlashPath = '/users//123';
console.log(`Testing '${doubleSlashPath}':`, layer.regexp.test(doubleSlashPath));
