import React, { useState } from 'react';
import axios from 'axios';

interface UploadResponse {
    video_id: number;
    message: string;
}

const UploadForm = () => {
    const [file, setFile] = useState<File | null>(null);
    const [title, setTitle] = useState('');
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
    const [uploadedVideoId, setUploadedVideoId] = useState<number | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setMessage(null);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) {
            setMessage({ text: 'Пожалуйста, выберите файл', type: 'error' });
            return;
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('title', title || file.name);

        try {
            setUploading(true);
            setMessage({ text: 'Загрузка видео...', type: 'info' });

            const response = await axios.post<UploadResponse>('http://localhost:8000/api/upload/', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            setUploadedVideoId(response.data.video_id);
            setMessage({ 
                text: `✅ Видео успешно загружено! ID: ${response.data.video_id}`, 
                type: 'success' 
            });
            
            // Очищаем форму
            setTitle('');
            setFile(null);
            
            // Сбрасываем input file
            const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
            if (fileInput) fileInput.value = '';

        } catch (error) {
            console.error('Ошибка загрузки:', error);
            setMessage({ 
                text: '❌ Ошибка при загрузке видео. Попробуйте снова.', 
                type: 'error' 
            });
        } finally {
            setUploading(false);
        }
    };

    const checkStatus = async () => {
        if (!uploadedVideoId) return;

        try {
            const response = await axios.get(`http://localhost:8000/api/video/${uploadedVideoId}/status`);
            setMessage({ 
                text: `Статус видео: ${response.data.status === 'processed' ? 'Обработано' : 'В обработке'}`, 
                type: 'info' 
            });
        } catch (error) {
            console.error('Ошибка проверки статуса:', error);
        }
    };

    return (
        <div>
            <form onSubmit={handleSubmit}>
                <h2>Загрузить видео</h2>
                
                <div className="form-group">
                    <label htmlFor="title">Название видео:</label>
                    <input
                        id="title"
                        type="text"
                        placeholder="Введите название видео"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        disabled={uploading}
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="file">Выберите видеофайл:</label>
                    <input
                        id="file"
                        type="file"
                        accept="video/*"
                        onChange={handleFileChange}
                        disabled={uploading}
                    />
                    {file && (
                        <small>Выбран файл: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</small>
                    )}
                </div>

                <button type="submit" disabled={uploading || !file}>
                    {uploading ? 'Загрузка...' : 'Загрузить видео'}
                </button>
            </form>

            {message && (
                <div className={`message ${message.type}`}>
                    {message.text}
                </div>
            )}

            {uploadedVideoId && (
                <div className="video-info">
                    <h3>Видео загружено!</h3>
                    <p>ID видео: <strong>{uploadedVideoId}</strong></p>
                    <button onClick={checkStatus} style={{ marginRight: '10px' }}>
                        Проверить статус обработки
                    </button>
                    <a 
                        href={`http://localhost:8000/api/video/${uploadedVideoId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Информация о видео (API)
                    </a>
                </div>
            )}
        </div>
    );
};

export default UploadForm;