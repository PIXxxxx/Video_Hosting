import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import Navbar from './components/Navbar';
import VideoListPage from './pages/VideoListPage';
import VideoWatchPage from './pages/VideoWatchPage';
import VideoEditPage from './pages/VideoEditPage';
import UploadForm from './components/UploadForm';
import Login from './components/Login';
import Register from './components/Register';
import ChannelPage from './pages/ChannelPage';
import PrivateRoute from './components/PrivateRoute';

import { AuthProvider } from './context/AuthContext';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          {/* ← Только один Navbar — он уже содержит всё нужное */}
          <Navbar />

          <main className="main-content">
            <Routes>
              <Route path="/" element={<VideoListPage />} />
              <Route path="/video/:id" element={<VideoWatchPage />} />
              <Route path="/video/:id/edit" element={<PrivateRoute><VideoEditPage /></PrivateRoute>} />
              <Route path="/upload" element={<PrivateRoute><UploadForm /></PrivateRoute>} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/channel/:id" element={<ChannelPage />} />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;