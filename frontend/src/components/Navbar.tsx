import React from 'react';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';
import SearchBar from './SearchBar';

const Navbar: React.FC = () => {
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <nav className="navbar">
      <div className="nav-container">
        <a href="/" className="nav-logo">
          VideoHosting
        </a>
        
        <div className="nav-menu">
          <SearchBar />
          {isAuthenticated ? (
            <>
              <a href="/upload" className="nav-link">Загрузить видео</a>
              <div className="user-menu">
                <span className="username">{user?.username}</span>
                <button onClick={logout} className="logout-btn">
                  Выйти
                </button>
              </div>
            </>
          ) : (
            <>
              <a href="/login" className="nav-link">Вход</a>
              <a href="/register" className="nav-link register-link">Регистрация</a>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;