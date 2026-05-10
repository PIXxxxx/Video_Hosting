// src/components/VidicUploadForm.tsx
import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import styles from './UploadForm.module.css';
import { Link } from 'react-router-dom';

const VidicUploadForm = () => {
    const [file, setFile] = useState<File | null>(null);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const { user } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) {
            setError('Выберите вертикальное видео');
            return;
        }

        setUploading(true);
        setMessage('');
        setError('');

        const formData = new FormData();
        formData.append('file', file);
        formData.append('title', title);
        formData.append('description', description);

        try {
            const response = await axios.post('http://localhost:8000/api/upload-vidic', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
            });

            setMessage('✅ Vidic видео успешно загружено! Обработка начата.');
            
            // Очистка формы
            setTitle('');
            setDescription('');
            setFile(null);
            
            const fileInput = document.getElementById('vidic-upload') as HTMLInputElement;
            if (fileInput) fileInput.value = '';

        } catch (error: any) {
            console.error('Ошибка загрузки Vidic:', error);
            setError(error.response?.data?.detail || 'Ошибка загрузки');
        } finally {
            setUploading(false);
        }
    };

    if (!user) {
        return <div className={styles['auth-message']}>Войдите для загрузки Vidic</div>;
    }

    return (
        <div className={styles['upload-container']}>
            <div className={styles['upload-type-selector']}>
                <Link to="/upload" className={styles['upload-link']}>📹 Обычное видео</Link>
                <Link to="/upload/vidic" className={styles['upload-link-active']}>📱 Vidic (Вертикальное)</Link>
            </div>

            <div className={styles['upload-form']}>
                <form onSubmit={handleSubmit}>
                    <div className={styles['form-group']}>
                        <label>Название Vidic</label>
                        <input
                            className={styles['form-input']}
                            type="text"
                            placeholder="Название вертикального видео..."
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            disabled={uploading}
                            required
                        />
                    </div>

                    <div className={styles['form-group']}>
                        <label>Описание</label>
                        <textarea
                            className={styles['form-textarea']}
                            placeholder="Описание..."
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            rows={5}
                            disabled={uploading}
                        />
                    </div>

                    <div className={styles['form-group']}>
                        <label>Видео файл (9:16)</label>
                        <div className={styles['file-input-wrapper']}>
                            <input
                                type="file"
                                accept="video/*"
                                onChange={e => setFile(e.target.files?.[0] || null)}
                                disabled={uploading}
                                id="vidic-upload"
                            />
                            <label htmlFor="vidic-upload" className={styles['file-input-label']}>
                                📱 {file ? 'Файл выбран' : 'Выберите вертикальное видео'}
                            </label>
                        </div>
                        {file && <div className={styles['file-name']}>{file.name}</div>}
                    </div>

                    <button type="submit" disabled={uploading} className={styles['submit-button']}>
                        {uploading ? '⏳ Обработка...' : '🚀 Загрузить в Vidic'}
                    </button>
                </form>

                {message && <div className={`${styles.message} ${styles.success}`}>{message}</div>}
                {error && <div className={`${styles.message} ${styles.error}`}>{error}</div>}
            </div>
        </div>
    );
};

export default VidicUploadForm;