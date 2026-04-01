import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import apiRouter from './routes/api';
import dailyBonusRouter from './routes/dailyBonus';
import { setupGameSocket } from './socket/gameSocket';

const PORT = parseInt(process.env.PORT || '3001', 10);
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost';

const app = express();
const httpServer = createServer(app as any);

const io = new Server(httpServer, {
  cors: {
    origin: CORS_ORIGIN,
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

// REST API routes
app.use('/api', apiRouter);
app.use('/api', dailyBonusRouter);

// Socket.IO setup
setupGameSocket(io);

httpServer.listen(PORT, () => {
  console.log(`Hearts server running on port ${PORT}`);
});

export { app, httpServer, io };
