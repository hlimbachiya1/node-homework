# Node.js Fundamentals

## What is Node.js?
A runtime that lets JavaScript execute outside the browser (on your machine or a server), built on Google's V8 engine.

## How does Node.js differ from running JavaScript in the browser?
There is no window/document/DOM. It instead has file system, process, and OS aceess. we have a sandbox running in browser for safety so that user don't run untrusted code from random websites. Node doesn't do that and thats why there is no sandbox for node.

## What is the V8 engine, and how does Node use it?
V8 is the engine (the thing that turns JS into machine instructions) that Google built for Chrome. Node pulls V8 out of the browser and wraps extra APIs around it.

## What are some key use cases for Node.js?
Web APIs/servers, CLIs, real-time apps with like dashboards and chats and all, scripts and other build tools.

## Explain the difference between CommonJS and ES Modules. Give a code example of each.

**CommonJS (default in Node.js):**
```js
//  CommonJS uses require()/module.exports

// exporting (math.js)
const add = (a, b) => a + b;
const subtract = (a, b) => a - b;

module.exports = { add, subtract };

//importing (app.js)
const { add, subtract } = require('./math.js');

console.log(add(5, 3));      // Output: 8
console.log(subtract(5, 3)); // Output: 2

```

**ES Modules (supported in modern Node.js):**
```js
// ES Modules use import/export

// exporting (math.js)
export const add = (a, b) => a + b;
export const subtract = (a, b) => a - b;

//importing (app.js)
import { add, subtract } from './math.js';

console.log(add(5, 3));      // Output: 8
console.log(subtract(5, 3)); // Output: 2
``` 