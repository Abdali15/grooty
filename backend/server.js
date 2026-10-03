import http from 'node:http';
import handler from './app.js';
const server=http.createServer(handler);server.requestTimeout=15000;server.headersTimeout=10000;
server.listen(Number(process.env.PORT)||3000,'127.0.0.1',()=>console.log('Grooty backend disponible en loopback. Usa Vite con proxy para desarrollo.'));
