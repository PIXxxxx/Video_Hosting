import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SearchBar from './SearchBar';
import axios from 'axios';
import './Navbar.css';
import { useTheme } from '../hooks/useTheme';

// SVG Иконки
const MenuIcon = () => (
  <svg viewBox="0 0 24 24">
    <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
  </svg>
);

const YouTubeIcon = () => (
  <svg viewBox="0 0 24 24">
    <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
  </svg>
);

const UploadIcon = () => (
  <svg viewBox="0 0 24 24">
    <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4zM14 13h-3v3H9v-3H6v-2h3V8h2v3h3v2z"/>
  </svg>
);

const SunIcon = () => (
  <svg viewBox="0 0 24 24">
    <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z"/>
  </svg>
);

const MoonIcon = () => (
  <svg viewBox="0 0 24 24">
    <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z"/>
  </svg>
);

const CloseIcon = () => (
  <svg viewBox="0 0 24 24">
    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
  </svg>
);

const HomeIcon = () => (
  <svg viewBox="0 0 24 24">
    <path d="M12 5.69l5 4.5V18h-2v-6H9v6H7v-7.81l5-4.5M12 3L2 12h3v8h6v-6h2v6h6v-8h3L12 3z"/>
  </svg>
);

const VideoIcon = () => (
  <svg viewBox="0 0 24 24">
    <path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z"/>
  </svg>
);

const HistoryIcon = () => (
  <svg viewBox="0 0 24 24">
    <path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/>
  </svg>
);

const SubscriptionsIcon = () => (
  <svg viewBox="0 0 24 24">
    <path d="M20 7H4V5h16v2zm0 6H4v-2h16v2zm0 6H4v-2h16v2zm-16 2h16v2H4v-2z"/>
  </svg>
);

const LogoutIcon = () => (
  <svg viewBox="0 0 24 24">
    <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
  </svg>
);

const Navbar: React.FC = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  // Загружаем аватарку пользователя
  useEffect(() => {
    const fetchAvatar = async () => {
      if (user?.id) {
        try {
          const response = await axios.get(`http://localhost:8000/api/channel/${user.id}`);
          if (response.data?.avatar_url) {
            setAvatarUrl(response.data.avatar_url);
          }
        } catch (error) {
          console.error('Ошибка загрузки аватарки:', error);
        }
      }
    };

    if (isAuthenticated && user) {
      fetchAvatar();
    }
  }, [user, isAuthenticated]);

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

  const getUserInitial = () => {
    return user?.username?.charAt(0).toUpperCase() || 'U';
  };

  return (
    <>
      <nav className="navbar">
        <div className="nav-container">
          <div className="nav-left">
            <button className="hamburger" onClick={toggleMenu} aria-label="Меню">
              <MenuIcon />
            </button>
            
            <Link to="/" className="nav-logo">
              <div className="logo-icon">
                <YouTubeIcon />
              </div>
              <span className="logo-text">VideoHosting</span>
            </Link>
          </div>

          <div className="nav-center">
            <SearchBar />
          </div>

          <div className="nav-right">
            <button 
              onClick={toggleTheme} 
              className="theme-toggle" 
              aria-label="Переключить тему"
            >
              {theme === 'light' ? <MoonIcon /> : <SunIcon />}
            </button>

            {isAuthenticated && (
              <Link to="/upload" className="upload-btn">
                <UploadIcon />
                <span>Загрузить</span>
              </Link>
            )}

            {isAuthenticated && user ? (
              <div className="user-section" onClick={goToMyChannel}>
                {/* Показываем реальную аватарку, если есть */}
                {avatarUrl ? (
                  <img 
                    src={avatarUrl} 
                    alt={user.username}
                    className="user-avatar"
                    onError={(e) => {
                      // Если не загрузилась - прячем и показываем инициалы
                      e.currentTarget.style.display = 'none';
                      const parent = e.currentTarget.parentElement;
                      if (parent && !parent.querySelector('.user-avatar-placeholder')) {
                        const placeholder = document.createElement('div');
                        placeholder.className = 'user-avatar-placeholder';
                        placeholder.textContent = getUserInitial();
                        parent.insertBefore(placeholder, parent.firstChild);
                      }
                    }}
                  />
                ) : (
                  <div className="user-avatar-placeholder">
                    {getUserInitial()}
                  </div>
                )}
                <span className="username">{user.username}</span>
              </div>
            ) : (
              <div className="auth-buttons">
                <Link to="/login" className="login-btn">Войти</Link>
                <Link to="/register" className="register-btn">Регистрация</Link>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Боковое меню - без изменений */}
      {menuOpen && (
        <div className="sidebar-overlay" onClick={() => setMenuOpen(false)}>
          <div className="sidebar" onClick={e => e.stopPropagation()}>
            <div className="sidebar-header">
              <h3>Меню</h3>
              <button className="close-sidebar" onClick={() => setMenuOpen(false)} aria-label="Закрыть">
                <CloseIcon />
              </button>
            </div>

            <div className="sidebar-nav">
              <div className="sidebar-section">
                <div className="sidebar-section-title">Навигация</div>
                
                <Link to="/" className="sidebar-item" onClick={() => setMenuOpen(false)}>
                  <HomeIcon />
                  Главная
                </Link>

                <Link to={`/channel/${user?.id}`} className="sidebar-item" onClick={() => setMenuOpen(false)}>
                  <VideoIcon />
                  Мои видео
                </Link>
              </div>

              <div className="sidebar-section">
                <div className="sidebar-section-title">Библиотека</div>
                
                <Link to="/history" className="sidebar-item" onClick={() => setMenuOpen(false)}>
                  <HistoryIcon />
                  История просмотров
                </Link>

                <Link to="/subscriptions" className="sidebar-item" onClick={() => setMenuOpen(false)}>
                  <SubscriptionsIcon />
                  Подписки
                </Link>
              </div>

              {isAuthenticated && (
                <>
                  <div className="sidebar-divider"></div>
                  <button 
                    onClick={() => { logout(); setMenuOpen(false); }} 
                    className="sidebar-item logout"
                  >
                    <LogoutIcon />
                    Выйти
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;