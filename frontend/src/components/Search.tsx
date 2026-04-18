import React, { useState } from 'react';

export default function Search({ searchResponse }: any) {
  if (!searchResponse) return null;

  return (
    <div className="search-results mt-4">
      {searchResponse.meta?.isMock && (
        <div className="bg-yellow-50 border border-yellow-300 text-yellow-800 px-4 py-3 rounded mb-4 flex items-center gap-2">
          <span>⚠️</span>
          <span>
            <strong>Demo Mode</strong> — Showing simulated results.
            Configure <code>SERPAPI_KEY</code> in backend for live search.
          </span>
        </div>
      )}
      <ul className="space-y-4">
        {searchResponse.results?.map((result: any, i: number) => (
          <li key={i} className="border p-3 rounded bg-white shadow-sm">
            <a href={result.url} className="text-blue-600 font-semibold hover:underline" target="_blank" rel="noreferrer">
              {result.title}
            </a>
            <p className="text-sm text-gray-600 mt-1">{result.snippet}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
