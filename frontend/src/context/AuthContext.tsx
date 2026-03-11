import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

interface User {
  id: number;
  username: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  // Настройка axios для автоматической отправки токена
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // Проверка токена при загрузке
  useEffect(() => {
    const fetchUser = async () => {
      if (token) {
        try {
          const response = await axios.get('http://localhost:8000/api/users/me');
          setUser(response.data);
        } catch (error) {
          console.error('Failed to fetch user:', error);
          localStorage.removeItem('token');
          setToken(null);
        }
      }
      setLoading(false);
    };

    fetchUser();
  }, [token]);

const login = async (username: string, password: string) => {
  try {
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);

    // Логин без токена
    const response = await axios.post('http://localhost:8000/api/login', formData);
    const { access_token } = response.data;
    
    // Сохраняем токен
    localStorage.setItem('token', access_token);
    
    // Создаём новый экземпляр axios с токеном
    const authAxios = axios.create({
      headers: {
        'Authorization': `Bearer ${access_token}`
      }
    });
    
    // Используем его для запроса пользователя
    const userResponse = await authAxios.get('http://localhost:8000/api/users/me');
    
    // Обновляем состояние
    setToken(access_token);
    setUser(userResponse.data);
    
    // Обновляем дефолтные заголовки для будущих запросов
    axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
    
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
};

  const register = async (email: string, username: string, password: string) => {
    try {
      await axios.post('http://localhost:8000/api/register', {
        email,
        username,
        password
      });
      
      // После успешной регистрации выполняем вход
      await login(username, password);
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      login,
      register,
      logout,
      isAuthenticated: !!user,
      loading
    }}>
      {children}
    </AuthContext.Provider>
  );
};