import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from './api';
import { useLang } from './LangContext';

export default function GlobalSearch({ collapsed }) {
  const { t } = useLang();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }
    const delayDebounceFn = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.get(`/search?q=${encodeURIComponent(query)}`);
        setResults(res.results || []);
        setIsOpen(true);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const handleSelect = (item) => {
    setIsOpen(false);
    setQuery('');
    navigate(item.url);
  };

  if (collapsed) {
    return (
      <div className="global-search collapsed" style={{ margin: '10px', textAlign: 'center' }}>
        <span style={{ cursor: 'pointer', fontSize: 16 }} title="搜尋">🔍</span>
      </div>
    );
  }

  return (
    <div className="global-search" ref={containerRef} style={{ position: 'relative', margin: '0 12px 16px 12px' }}>
      <div style={{ position: 'relative' }}>
        <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: 'var(--c-text-muted)' }}>🔍</span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="全系統搜尋..."
          style={{
            width: '100%', padding: '8px 10px 8px 30px', borderRadius: 8,
            border: '1px solid var(--c-border)', background: 'var(--c-bg)',
            color: 'var(--c-text)', fontSize: 13, outline: 'none'
          }}
          onFocus={() => { if (results.length > 0) setIsOpen(true); }}
        />
        {loading && <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 12 }}>⌛</span>}
      </div>

      {isOpen && results.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
          background: 'var(--c-bg-card-solid)', border: '1px solid var(--c-border)',
          borderRadius: 8, boxShadow: 'var(--shadow-md)', zIndex: 1000,
          maxHeight: 400, overflowY: 'auto'
        }}>
          {results.map((item, i) => (
            <div
              key={`${item.type}-${item.id}`}
              onClick={() => handleSelect(item)}
              style={{
                padding: '10px 12px', cursor: 'pointer',
                borderBottom: i < results.length - 1 ? '1px solid var(--c-border)' : 'none',
                transition: 'background 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--c-bg)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--c-text)', marginBottom: 4 }}>
                {item.title}
              </div>
              <div style={{ fontSize: 11, color: 'var(--c-text-muted)' }}>
                {item.subtitle}
              </div>
            </div>
          ))}
        </div>
      )}
      {isOpen && !loading && query.length >= 2 && results.length === 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
          background: 'var(--c-bg-card-solid)', border: '1px solid var(--c-border)',
          borderRadius: 8, boxShadow: 'var(--shadow-md)', zIndex: 1000,
          padding: 16, textAlign: 'center', fontSize: 13, color: 'var(--c-text-muted)'
        }}>
          找不到符合「{query}」的結果
        </div>
      )}
    </div>
  );
}
