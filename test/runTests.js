import assert from 'assert';
import { slugify, generateTitle } from '../utils.js';

assert.strictEqual(slugify('Hello World!'), 'hello-world');
const { title, file } = generateTitle('Test prompt for title');
assert.ok(/\d{4}-\d{2}-\d{2}/.test(title), 'title has date');
assert.ok(file.endsWith('.json'));
console.log('All tests passed');
