import axios from 'axios';

// Perform web search using SerpAPI or Bing
export async function performSearch(query) {
  try {
    // Try SerpAPI first
    if (process.env.SERPAPI_KEY) {
      return await searchWithSerpAPI(query);
    }

    // Fallback to Bing
    if (process.env.BING_API_KEY) {
      return await searchWithBing(query);
    }

    // Fallback to mock results
    return getMockSearchResults(query);
  } catch (error) {
    console.error('Search error:', error);
    return getMockSearchResults(query);
  }
}

// Search using SerpAPI
async function searchWithSerpAPI(query) {
  try {
    const response = await axios.get('https://serpapi.com/search', {
      params: {
        q: query,
        api_key: process.env.SERPAPI_KEY,
        engine: 'google',
      },
    });

    return response.data.organic_results.slice(0, 10).map((result) => ({
      title: result.title,
      snippet: result.snippet,
      link: result.link,
      source: 'SerpAPI',
    }));
  } catch (error) {
    console.error('SerpAPI error:', error.message);
    throw error;
  }
}

// Search using Bing API
async function searchWithBing(query) {
  try {
    const response = await axios.get('https://api.bing.microsoft.com/v7.0/search', {
      headers: {
        'Ocp-Apim-Subscription-Key': process.env.BING_API_KEY,
      },
      params: {
        q: query,
        count: 10,
      },
    });

    return response.data.webPages.value.map((result) => ({
      title: result.name,
      snippet: result.snippet,
      link: result.url,
      source: 'Bing',
    }));
  } catch (error) {
    console.error('Bing API error:', error.message);
    throw error;
  }
}

// Mock search results for testing
function getMockSearchResults(query) {
  const mockResults = [
    {
      title: `Search results for "${query}" - Wikipedia`,
      snippet: `Wikipedia article about ${query}. Learn more about this topic from the most comprehensive reference source.`,
      link: `https://en.wikipedia.org/wiki/${query.replace(/\s+/g, '_')}`,
      source: 'Mock',
    },
    {
      title: `${query} - Official Documentation`,
      snippet: `Official documentation and guides for ${query}. Get started with tutorials and API references.`,
      link: `https://docs.example.com/${query.replace(/\s+/g, '-')}`,
      source: 'Mock',
    },
    {
      title: `${query} Tutorial - Learn Everything`,
      snippet: `Complete tutorial on ${query}. Step-by-step guide for beginners and advanced users.`,
      link: `https://tutorial.example.com/${query.replace(/\s+/g, '-')}`,
      source: 'Mock',
    },
    {
      title: `${query} Best Practices and Tips`,
      snippet: `Discover best practices for working with ${query}. Expert tips to improve your skills.`,
      link: `https://blog.example.com/${query.replace(/\s+/g, '-')}`,
      source: 'Mock',
    },
    {
      title: `Stack Overflow - ${query} Questions`,
      snippet: `Community Q&A about ${query}. Find solutions to common problems and learn from others.`,
      link: `https://stackoverflow.com/questions/tagged/${query.replace(/\s+/g, '%20')}`,
      source: 'Mock',
    },
  ];

  return mockResults;
}

export default performSearch;
