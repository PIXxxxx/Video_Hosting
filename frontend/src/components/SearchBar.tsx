// src/components/SearchBar.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './SearchBar.css';

const SearchBar: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await axios.get(`http://localhost:8000/api/search?q=${query}`);
        setResults(res.data);
        setShowResults(true);
      } catch (err) {
        console.error(err);
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
          {results.length > 0 ? (
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
                    e.currentTarget.src = 'https://via.placeholder.com/80x45/333/fff?text=Нет+фото';
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