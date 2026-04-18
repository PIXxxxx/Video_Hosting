import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SearchBar from './SearchBar';
import './Navbar.css';
import { useTheme } from '../hooks/useTheme';

const Navbar: React.FC = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    if (menuOpen) {
      document.body.classList.add('menu-open');
    } else {
      document.body.classList.remove('menu-open');
    }
    return () => document.body.classList.remove('menu-open');
  }, [menuOpen]);

  const toggleMenu = () => setMenuOpen(!menuOpen);

  const goToMyChannel = () => {
    if (user) navigate(`/channel/${user.id}`);
    setMenuOpen(false);
  };

  return (
    <>
      <nav className="navbar">
        <div className="nav-container">
          <button className="hamburger" onClick={toggleMenu}>☰</button>

          <Link to="/" className="nav-logo">VideoHosting</Link>

          <div className="nav-menu">
            <button onClick={toggleTheme} className="theme-toggle">
              {theme === 'light' ? '🌙 Тёмная' : '☀️ Светлая'}
            </button>
            <SearchBar />
            <Link to="/upload" className="nav-link">Загрузить видео</Link>

            {isAuthenticated && user ? (
              <div className="user-section" onClick={goToMyChannel}>
                <img 
                  src={`https://ui-avatars.com/api/?name=${user.username}&background=random`} 
                  alt={user.username}
                  className="avatar"
                />
                <span className="username">{user.username}</span>
              </div>
            ) : (
              <>
                <Link to="/login" className="nav-link">Вход</Link>
                <Link to="/register" className="nav-link">Регистрация</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Боковое меню */}
      {menuOpen && (
        <div className="sidebar" onClick={() => setMenuOpen(false)}>
          <div className="sidebar-content" onClick={e => e.stopPropagation()}>
            <div className="sidebar-header">
              <h3>Меню</h3>
              <button className="close-btn" onClick={() => setMenuOpen(false)}>✕</button>
            </div>

            <Link to={`/channel/${user?.id}`} className="sidebar-item" onClick={() => setMenuOpen(false)}>
              📁 Мои видео
            </Link>

            <Link to="/history" className="sidebar-item" onClick={() => setMenuOpen(false)}>
              ⏱ История просмотров
            </Link>

            <Link to="/subscriptions" className="sidebar-item" onClick={() => setMenuOpen(false)}>
              ⭐ Подписки
            </Link>

            <button 
              onClick={() => { logout(); setMenuOpen(false); }} 
              className="sidebar-item logout"
            >
              🚪 Выйти
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;