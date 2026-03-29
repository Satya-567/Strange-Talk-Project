import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import db from './db';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.use(cors());
app.use(express.json());

// Auth Routes
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    try {
        const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;
        if (user && user.password === password) {
            res.json({ id: user.id, username: user.username });
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/signup', (req, res) => {
    const { username, password } = req.body;
    try {
        const info = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run(username, password);
        res.json({ id: info.lastInsertRowid, username });
    } catch (err) {
        res.status(400).json({ error: 'Username taken' });
    }
});

// Socket.IO State
let textQueue: Socket | null = null;
let videoQueue: Socket | null = null;
const activeRooms = new Map<string, string>(); // socket.id -> roomId

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // --- MATCHMAKING ---
    socket.on('join_random', (type: 'text' | 'video') => {
        if (type === 'text') {
            if (textQueue && textQueue.id !== socket.id) {
                const roomId = `room_text_${Date.now()}`;
                socket.join(roomId);
                textQueue.join(roomId);
                activeRooms.set(socket.id, roomId);
                activeRooms.set(textQueue.id, roomId);

                io.to(roomId).emit('matched', { roomId, type: 'text' });
                textQueue = null;
            } else {
                textQueue = socket;
            }
        } else if (type === 'video') {
            if (videoQueue && videoQueue.id !== socket.id) {
                const roomId = `room_video_${Date.now()}`;
                socket.join(roomId);
                videoQueue.join(roomId);
                activeRooms.set(socket.id, roomId);
                activeRooms.set(videoQueue.id, roomId);

                // The peer that arrives second is the initiator
                socket.emit('matched', { roomId, initiator: true });
                videoQueue.emit('matched', { roomId, initiator: false });
                videoQueue = null;
            } else {
                videoQueue = socket;
            }
        }
    });

    // --- CUSTOM ROOMS ---
    socket.on('join_room', (roomId: string) => {
        socket.join(roomId);
        activeRooms.set(socket.id, roomId);
        socket.to(roomId).emit('peer_joined', socket.id);
    });

    // --- MESSAGING ---
    socket.on('send_message', (data: { roomId: string, text: string }) => {
        socket.to(data.roomId).emit('receive_message', data.text);
    });

    // --- WEBRTC SIGNALING ---
    socket.on('signal', (data: { roomId: string, signal: any }) => {
        socket.to(data.roomId).emit('signal', data.signal);
    });

    // --- LEAVING & DISCONNECT ---
    const handleLeave = () => {
        if (textQueue?.id === socket.id) textQueue = null;
        if (videoQueue?.id === socket.id) videoQueue = null;

        const roomId = activeRooms.get(socket.id);
        if (roomId) {
            socket.to(roomId).emit('peer_left');
            socket.leave(roomId);
            activeRooms.delete(socket.id);
        }
    };

    socket.on('leave_room', handleLeave);
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        handleLeave();
    });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
