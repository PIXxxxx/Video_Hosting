import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import './CommentSection.css';

interface CommentSectionProps {
  videoId: number;
}

const CommentSection: React.FC<CommentSectionProps> = ({ videoId }) => {
  const { isAuthenticated, user } = useAuth();
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<number | null>(null);

  const loadComments = async () => {
    const res = await axios.get(`http://localhost:8000/api/video/${videoId}/comments`);
    setComments(res.data);
  };

  useEffect(() => { loadComments(); }, [videoId]);

  const sendComment = async () => {
    if (!newComment.trim()) return;
    await axios.post(`http://localhost:8000/api/video/${videoId}/comments`, {
      text: newComment,
      parent_id: replyTo
    });
    setNewComment('');
    setReplyTo(null);
    loadComments();
  };

  return (
    <div className="comments-section">
      <h3>Комментарии ({comments.length})</h3>

      {isAuthenticated ? (
        <div className="comment-form">
          <textarea
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            placeholder={replyTo ? "Ответить..." : "Напишите комментарий..."}
          />
          <button onClick={sendComment}>Отправить</button>
          {replyTo && <button onClick={() => setReplyTo(null)}>Отмена</button>}
        </div>
      ) : (
        <p>Войдите, чтобы писать комментарии</p>
      )}

      <div className="comments-list">
        {comments.map(c => (
          <div key={c.id} className="comment">
            <strong>{c.username}</strong>
            <p>{c.text}</p>
            <small>{new Date(c.created_at).toLocaleString()}</small>
            
            {isAuthenticated && (
              <button className="reply-btn" onClick={() => setReplyTo(c.id)}>
                Ответить
              </button>
            )}

            {c.replies && c.replies.map((r: any) => (
              <div key={r.id} className="reply">
                <strong>{r.username}</strong>: {r.text}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CommentSection;