import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import UploadForm from './components/UploadForm';
import Login from './components/Login';
import Register from './components/Register';
import VideoList from './components/VideoList';
import './App.css';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" />;
  return <>{children}</>;
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="App">
          <Navbar />
          <header className="App-header">
            <h1>Video Hosting</h1>
            <p>Загружайте и смотрите видео</p>
          </header>
          <main>
            <Routes>
              <Route path="/" element={<VideoList />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/upload" element={<ProtectedRoute><UploadForm /></ProtectedRoute>} />
              <Route path="/video/:id" element={<div>Страница видео (в разработке)</div>} />
            </Routes>
          </main>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;