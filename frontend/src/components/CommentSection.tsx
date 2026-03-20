import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import './CommentSection.css';

interface Comment {
  id: number;
  text: string;
  username: string;
  created_at: string;
  replies: Comment[];
}

interface CommentSectionProps {
  videoId: number;
}

const CommentSection: React.FC<CommentSectionProps> = ({ videoId }) => {
  const { isAuthenticated, user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  const loadComments = async () => {
    try {
      const res = await axios.get(`http://localhost:8000/api/video/${videoId}/comments`);
      setComments(res.data || []);
    } catch (err) {
      console.error('Ошибка загрузки комментариев:', err);
    }
  };

  useEffect(() => {
    loadComments();
  }, [videoId]);

  const sendComment = async () => {
    if (!newComment.trim()) return;
    try {
      await axios.post(`http://localhost:8000/api/video/${videoId}/comments`, {
        text: newComment,
        parent_id: replyTo
      });
      setNewComment('');
      setReplyTo(null);
      loadComments();
    } catch (err) {
      console.error('Ошибка отправки:', err);
    }
  };

  const toggleReplies = (commentId: number) => {
    setExpanded(prev => ({ ...prev, [commentId]: !prev[commentId] }));
  };

  return (
    <div className="comments-section">
      <h3>Комментарии {comments.length > 0 ? `(${comments.length})` : ''}</h3>

      {isAuthenticated ? (
        <div className="comment-form">
          <textarea
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            placeholder={replyTo ? "Ответить..." : "Напишите комментарий..."}
          />
          <div className="form-buttons">
            <button className="send-btn" onClick={sendComment}>
              Отправить
            </button>
            {replyTo && (
              <button className="cancel-btn" onClick={() => setReplyTo(null)}>
                Отмена
              </button>
            )}
          </div>
        </div>
      ) : (
        <p className="auth-hint">Войдите, чтобы оставить комментарий</p>
      )}

      <div className="comments-list">
        {comments.length === 0 ? (
          <p className="no-comments">Пока нет комментариев</p>
        ) : (
          comments.map(comment => (
            <div key={comment.id} className="comment-item">
              <div className="comment-header">
                <strong className="username">{comment.username}</strong>
                <span className="comment-date">
                  {new Date(comment.created_at).toLocaleString('ru-RU', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>

              <p className="comment-text">{comment.text}</p>

              {isAuthenticated && (
                <button
                  className="reply-button"
                  onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
                >
                  {replyTo === comment.id ? 'Отменить' : 'Ответить'}
                </button>
              )}

              {comment.replies?.length > 0 && (
                <button
                  className="toggle-replies-btn"
                  onClick={() => toggleReplies(comment.id)}
                >
                  {expanded[comment.id]
                    ? `Скрыть ответы (${comment.replies.length})`
                    : `Показать ответы (${comment.replies.length})`}
                </button>
              )}

              {expanded[comment.id] && comment.replies?.length > 0 && (
                <div className="replies-list">
                  {comment.replies.map(reply => (
                    <div key={reply.id} className="reply-item">
                      <div className="reply-header">
                        <strong>{reply.username}</strong>
                        <span>
                          {new Date(reply.created_at).toLocaleString('ru-RU', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <p className="reply-text">{reply.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CommentSection;