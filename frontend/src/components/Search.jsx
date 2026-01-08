import { useState } from 'react';
import { api } from '../services/api';

function Search() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setError(null);
    setIsLoading(true);
    setHasSearched(true);

    try {
      const response = await api.post('/search', {
        query: query.trim(),
      });

      setResults(response.data.results || []);
    } catch (err) {
      console.error('Search error:', err);
      setError(err.response?.data?.error || err.message || 'Search failed');
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const openLink = (url) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>Search</h2>
        <p>Web search powered by AION</p>
      </div>

      {/* Search Form */}
      <form onSubmit={handleSearch} style={styles.searchForm}>
        <div style={styles.searchInputGroup}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search the web..."
            disabled={isLoading}
            style={styles.searchInput}
          />
          <button
            type="submit"
            disabled={isLoading || !query.trim()}
            style={{
              ...styles.searchButton,
              ...(isLoading || !query.trim() ? styles.buttonDisabled : {}),
            }}
          >
            {isLoading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </form>

      {/* Error Display */}
      {error && (
        <div style={styles.error}>
          Error: {error}
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div style={styles.loading}>
          <p>Searching...</p>
        </div>
      )}

      {/* Results Display */}
      {!isLoading && hasSearched && results.length === 0 && !error && (
        <div style={styles.noResults}>
          <p>No results found for "{query}"</p>
        </div>
      )}

      {!isLoading && results.length > 0 && (
        <div style={styles.resultsContainer}>
          <p style={styles.resultCount}>
            Found {results.length} result{results.length !== 1 ? 's' : ''}
          </p>
          {results.map((result, idx) => (
            <div key={idx} style={styles.resultItem}>
              <h3
                style={styles.resultTitle}
                onClick={() => openLink(result.url)}
                role="button"
                tabIndex="0"
              >
                {result.title}
              </h3>
              <p style={styles.resultSnippet}>{result.snippet}</p>
              <p style={styles.resultUrl}>
                <a
                  href={result.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={styles.link}
                >
                  {result.url}
                </a>
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: '20px',
    backgroundColor: '#f9f9f9',
    minHeight: '100vh',
    fontFamily: 'Arial, sans-serif',
  },
  header: {
    marginBottom: '30px',
    textAlign: 'center',
    borderBottom: '2px solid #007bff',
    paddingBottom: '15px',
  },
  searchForm: {
    marginBottom: '30px',
    maxWidth: '600px',
    margin: '0 auto 30px auto',
  },
  searchInputGroup: {
    display: 'flex',
    gap: '10px',
  },
  searchInput: {
    flex: 1,
    padding: '12px',
    fontSize: '16px',
    border: '1px solid #ddd',
    borderRadius: '5px',
    boxSizing: 'border-box',
  },
  searchButton: {
    padding: '12px 24px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '16px',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
    color: '#666',
    cursor: 'not-allowed',
  },
  error: {
    padding: '15px',
    backgroundColor: '#f8d7da',
    color: '#721c24',
    borderRadius: '5px',
    marginBottom: '20px',
    border: '1px solid #f5c6cb',
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    color: '#666',
  },
  noResults: {
    textAlign: 'center',
    padding: '40px',
    color: '#999',
    fontSize: '16px',
  },
  resultsContainer: {
    maxWidth: '800px',
    margin: '0 auto',
  },
  resultCount: {
    color: '#666',
    marginBottom: '20px',
    fontSize: '14px',
  },
  resultItem: {
    backgroundColor: 'white',
    padding: '20px',
    marginBottom: '15px',
    borderRadius: '5px',
    border: '1px solid #e0e0e0',
  },
  resultTitle: {
    color: '#007bff',
    cursor: 'pointer',
    margin: '0 0 10px 0',
    fontSize: '18px',
  },
  resultSnippet: {
    color: '#555',
    margin: '0 0 10px 0',
    lineHeight: '1.6',
    fontSize: '14px',
  },
  resultUrl: {
    color: '#999',
    margin: '0',
    fontSize: '12px',
  },
  link: {
    color: '#0066cc',
    textDecoration: 'none',
  },
};

export default Search;
