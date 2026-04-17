import { useState } from 'react';
import api from '../services/api';

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
      const response = await api.post('/search', { query: query.trim() });
      setResults(response.data.results || []);
    } catch (err) {
      console.error('Search error:', err);
      setError(err.response?.data?.error || err.message || 'Search failed');
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto overscroll-contain bg-gray-950 text-white">
      <div className="w-full max-w-3xl mx-auto px-4 md:px-6 py-6">
        {/* Header */}
        <div className="mb-6 text-center">
          <h2 className="text-xl md:text-2xl font-bold text-white">Search</h2>
          <p className="text-gray-400 text-sm mt-1">Web search powered by AION</p>
        </div>

        {/* Search form */}
        <form onSubmit={handleSearch} className="mb-6">
          <div className="flex gap-2 items-stretch">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search the web..."
              disabled={isLoading}
              className="flex-1 bg-gray-800 text-white rounded-xl px-4 py-3 text-base border border-gray-700 focus:border-blue-500 focus:outline-none placeholder-gray-500 min-h-[44px]"
            />
            <button
              type="submit"
              disabled={isLoading || !query.trim()}
              className="px-5 py-3 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold rounded-xl text-base transition-colors touch-manipulation min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </form>

        {/* Error */}
        {error && (
          <div className="mb-4 px-4 py-3 bg-red-900/30 border border-red-800 text-red-400 rounded-xl text-sm">
            Error: {error}
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="text-center py-10 text-gray-400 text-sm">Searching...</div>
        )}

        {/* No results */}
        {!isLoading && hasSearched && results.length === 0 && !error && (
          <div className="text-center py-10 text-gray-500 text-sm">
            No results found for &ldquo;{query}&rdquo;
          </div>
        )}

        {/* Results — 1 col mobile, 2 col tablet+ */}
        {!isLoading && results.length > 0 && (
          <div>
            <p className="text-gray-500 text-xs mb-4">
              Found {results.length} result{results.length !== 1 ? 's' : ''}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
              {results.map((result, idx) => (
                <div
                  key={idx}
                  className="bg-gray-800 rounded-xl p-4 border border-gray-700 hover:border-gray-600 transition-colors"
                >
                  <a
                    href={result.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 font-medium text-sm md:text-base line-clamp-2 block mb-2"
                  >
                    {result.title}
                  </a>
                  <p className="text-gray-400 text-xs md:text-sm leading-relaxed line-clamp-3 mb-2">
                    {result.snippet}
                  </p>
                  <span className="text-gray-600 text-xs truncate block">{result.link}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Search;
