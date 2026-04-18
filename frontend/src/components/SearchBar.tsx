// src/components/SearchBar.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './SearchBar.css';

const SearchBar: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setShowResults(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await axios.get(`http://localhost:8000/api/search?q=${encodeURIComponent(query)}`);
        setResults(res.data);
        setShowResults(true);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Закрываем меню при клике вне поиска
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="search-container" ref={searchRef}>
      <input
        type="text"
        placeholder="Поиск видео или автора..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="search-input"
        onFocus={() => query.length >= 2 && setShowResults(true)}
      />

      {showResults && (
        <div className="search-results">
          {loading ? (
            <div className="no-results">Поиск...</div>
          ) : results.length > 0 ? (
            results.map(video => (
              <Link 
                key={video.id}
                to={`/video/${video.id}`}
                className="search-result-item"
                onClick={() => {
                  setQuery('');
                  setShowResults(false);
                }}
              >
                <img 
                  src={video.thumbnail} 
                  alt={video.title}
                  className="search-thumbnail"
                  onError={(e) => {
                    e.currentTarget.src = 'https://via.placeholder.com/88x50/333/fff?text=No+image';
                  }}
                />
                <div className="search-info">
                  <h4>{video.title}</h4>
                  <p>{video.author}</p>
                </div>
              </Link>
            ))
          ) : (
            <div className="no-results">
              Ничего не найдено по запросу "{query}"
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar;