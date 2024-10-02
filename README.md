# Workerr

While the event-driven mechanism of native Web Workers in JavaScript is powerful, it doesn't fully meet the needs of developers, especially when the goal is to run functions in parallel across different threads. Specifically, with the event-driven model, interacting with workers requires developers to set up message passing between threads, leading to more complex and harder-to-maintain code, especially when large amounts of data need to be transmitted back and forth. This increases the complexity of the application, making it difficult to scale and manage complex tasks.

`Workerr` was created to solve this problem. It simplifies communication with Web Workers by using a promisify mechanism, allowing developers to interact with workers as if they were using Promises. Additionally, Workerr integrates a worker pool mechanism, which efficiently manages and reuses workers, reducing the overhead of creating new workers for each task, thus improving application performance.

## Features

- [x] Browser support
- [ ] Node.js support
- [x] Abort handler
- [x] Strong TypeScript support
- [x] Worker pool implementation
- [ ] Transferable Object

### Usage
