import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { Video, MessageSquare, Plus, LogOut, MapPin } from 'lucide-react';

export default function Dashboard() {
    const { user, logout, locationPermission, setLocationPermission } = useAppStore();
    const navigate = useNavigate();
    const [roomId, setRoomId] = useState('');

    const requestLocation = () => {
        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                () => setLocationPermission(true),
                () => alert('Location permission denied.')
            );
        } else {
            alert('Geolocation is not supported by your browser.');
        }
    };

    const createRoom = () => {
        const newRoom = Math.random().toString(36).substring(2, 8).toUpperCase();
        navigate(`/video/${newRoom}`);
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', animation: 'fadeIn 0.5s ease-out' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
                <h2>Welcome, {user?.username} <span style={{ color: 'var(--success)', fontSize: '1rem', marginLeft: '0.5rem' }}>● Online</span></h2>
                <button onClick={logout} className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }}>
                    <LogOut size={18} /> Logout
                </button>
            </header>

            {!locationPermission && (
                <div className="glass-panel animate-fade-in" style={{ padding: '1.5rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <MapPin color="var(--accent-primary)" size={24} />
                        <div>
                            <h4 style={{ margin: 0 }}>Location Services</h4>
                            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Enable location to connect with people nearby (optional).</p>
                        </div>
                    </div>
                    <button onClick={requestLocation} className="btn btn-primary" style={{ padding: '0.5rem 1rem' }}>Enable</button>
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', display: 'flex', flexDirection: 'column' }}>
                    <MessageSquare size={48} color="var(--accent-primary)" style={{ margin: '0 auto 1rem' }} />
                    <h3>Text Chat</h3>
                    <p style={{ color: 'var(--text-secondary)', margin: '1rem 0', flex: 1 }}>Connect with a random stranger for a text conversation.</p>
                    <button onClick={() => navigate('/chat/random')} className="btn btn-primary" style={{ width: '100%' }}>Start Chatting</button>
                </div>

                <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', display: 'flex', flexDirection: 'column' }}>
                    <Video size={48} color="var(--accent-secondary)" style={{ margin: '0 auto 1rem' }} />
                    <h3>Video Chat</h3>
                    <p style={{ color: 'var(--text-secondary)', margin: '1rem 0', flex: 1 }}>Face-to-face conversations with random strangers.</p>
                    <button onClick={() => navigate('/video/random')} className="btn btn-primary" style={{ width: '100%' }}>Start Video</button>
                </div>
            </div>

            <div className="glass-panel" style={{ padding: '2rem', marginTop: '2rem' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                    <Plus size={24} color="var(--success)" /> Create or Join Private Room
                </h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                    Create a room code to share with friends, or enter a code to join an existing room.
                </p>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button onClick={createRoom} className="btn btn-secondary" style={{ flex: 1 }}>Create Room</button>
                    <div style={{ display: 'flex', flex: 1, gap: '0.5rem' }}>
                        <input
                            type="text"
                            placeholder="Enter Room Code"
                            value={roomId}
                            onChange={(e) => setRoomId(e.target.value)}
                        />
                        <button
                            onClick={() => roomId && navigate(`/video/${roomId}`)}
                            className="btn btn-primary"
                        >
                            Join
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
