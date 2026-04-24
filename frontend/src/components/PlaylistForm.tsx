// src/components/PlaylistForm.tsx
import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import styles from './PlaylistForm.module.css'; // создай если нужно

const PlaylistForm: React.FC<{ onCreated?: () => void }> = ({ onCreated }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    try {
      await axios.post('http://localhost:8000/api/playlists/', {
        title,
        description,
        is_private: isPrivate
      });
      setTitle('');
      setDescription('');
      setIsPrivate(false);
      alert('Плейлист создан!');
      onCreated?.();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Ошибка создания плейлиста');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <form onSubmit={handleSubmit} className={styles.form || ''}>
      <h3>Создать новый плейлист</h3>
      <input
        type="text"
        placeholder="Название плейлиста"
        value={title}
        onChange={e => setTitle(e.target.value)}
        required
      />
      <textarea
        placeholder="Описание (необязательно)"
        value={description}
        onChange={e => setDescription(e.target.value)}
      />
      <label>
        <input
          type="checkbox"
          checked={isPrivate}
          onChange={e => setIsPrivate(e.target.checked)}
        />
        Приватный плейлист
      </label>
      <button type="submit" disabled={loading}>
        {loading ? 'Создание...' : 'Создать плейлист'}
      </button>
    </form>
  );
};

export default PlaylistForm;