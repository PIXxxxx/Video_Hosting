import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      await login(username, password);
      window.location.href = '/'; // Перенаправляем на главную
    } catch (err) {
      setError('Неверное имя пользователя или пароль');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h2>Вход в аккаунт</h2>
        
        {error && <div className="error-message">{error}</div>}
        
        <div className="form-group">
          <input
            type="text"
            placeholder="Имя пользователя или Email"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            disabled={loading}
          />
        </div>
        
        <div className="form-group">
          <input
            type="password"
            placeholder="Пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
          />
        </div>
        
        <button type="submit" disabled={loading}>
          {loading ? 'Вход...' : 'Войти'}
        </button>
        
        <p className="auth-link">
          Нет аккаунта? <a href="/register">Зарегистрироваться</a>
        </p>
      </form>
    </div>
  );
};

export default Login;