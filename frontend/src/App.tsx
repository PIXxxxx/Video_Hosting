import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import UploadForm from './components/UploadForm';
import Login from './components/Login';
import Register from './components/Register';
import VideoListPage from './pages/VideoListPage';
import PrivateRoute from './components/PrivateRoute';
import './App.css';
import VideoWatchPage from './pages/VideoWatchPage';
import ChannelPage from './pages/ChannelPage';
import VideoEditPage from './pages/VideoEditPage';

function AppContent() {
  const { user, logout } = useAuth();
  return (
    <div className="App">
      <header className="App-header">
        <div className="header-container">
          <h1>Video Hosting</h1>
          <nav>
            <Link to="/" className="nav-link">Главная</Link>
            {user ? (
              <>
                <Link to="/upload" className="nav-link">Загрузить</Link>
                <span className="user-greeting">Привет, {user.username}!</span>
                <button onClick={logout} className="nav-button">Выйти</button>
              </>
            ) : (
              <>
                <Link to="/login" className="nav-link">Вход</Link>
                <Link to="/register" className="nav-link">Регистрация</Link>
                
              </>
            )}
          </nav>
        </div>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<VideoListPage />} />
          <Route path="/upload" element={
            <PrivateRoute>
              <UploadForm />
            </PrivateRoute>
          } />
          <Route path="/channel/:id" element={<ChannelPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/video/:id" element={<VideoWatchPage />} />
          <Route path="/video/:id/edit" element={<PrivateRoute><VideoEditPage /></PrivateRoute>} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;