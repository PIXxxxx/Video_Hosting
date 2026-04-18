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

  // Проверка токена при загрузке приложения
  useEffect(() => {
    const fetchUser = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        // Устанавливаем заголовок перед запросом
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        const response = await axios.get('http://localhost:8000/api/users/me');
        setUser(response.data);
      } catch (error: any) {
        console.error('Failed to fetch user:', error.response?.data || error.message);
        
        // Если токен недействителен — очищаем его
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          setToken(null);
          delete axios.defaults.headers.common['Authorization'];
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [token]);

  const login = async (username: string, password: string) => {
    try {
      const formData = new FormData();
      formData.append('username', username);
      formData.append('password', password);

      const response = await axios.post('http://localhost:8000/api/login', formData);
      const { access_token } = response.data;

      // Сохраняем токен
      localStorage.setItem('token', access_token);
      
      // Устанавливаем заголовок ДО запроса пользователя
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      setToken(access_token);

      // Запрашиваем данные пользователя
      const userResponse = await axios.get('http://localhost:8000/api/users/me');
      setUser(userResponse.data);
      
      console.log("✅ Успешный вход");
    } catch (error: any) {
      console.error('Login failed:', error.response?.data || error.message);
      throw error;
    }
  };

  const register = async (email: string, username: string, password: string) => {
    try {
      // Регистрация
      await axios.post('http://localhost:8000/api/register', {
        email,
        username,
        password
      });
      
      // После регистрации логинимся
      const formData = new FormData();
      formData.append('username', username);
      formData.append('password', password);

      const loginResponse = await axios.post('http://localhost:8000/api/login', formData);
      const { access_token } = loginResponse.data;

      // Сохраняем токен
      localStorage.setItem('token', access_token);
      
      // Устанавливаем заголовок ДО запроса пользователя
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      setToken(access_token);

      // Запрашиваем данные пользователя
      const userResponse = await axios.get('http://localhost:8000/api/users/me');
      setUser(userResponse.data);
      
      console.log("✅ Регистрация и вход успешны");
    } catch (error: any) {
      console.error('Registration failed:', error.response?.data || error.message);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
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