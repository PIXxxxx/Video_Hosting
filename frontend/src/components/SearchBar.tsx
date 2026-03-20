import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './SearchBar.css';

const SearchBar: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);

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

  return (
    <div className="search-container">
      <input
        type="text"
        placeholder="Поиск видео или автора..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="search-input"
        onFocus={() => query.length >= 2 && setShowResults(true)}
      />

      {showResults && results.length > 0 && (
        <div className="search-results">
          {results.map(video => (
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
              />
              <div className="search-info">
                <h4>{video.title}</h4>
                <p>{video.author}</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {showResults && results.length === 0 && query.length >= 2 && (
        <div className="search-results">
          <p className="no-results">Ничего не найдено</p>
        </div>
      )}
    </div>
  );
};

export default SearchBar;