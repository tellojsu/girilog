import { useState, useEffect, useRef } from 'react';

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

interface Suggestion {
  display_name: string;
  place_id: number;
  address?: {
    house_number?: string;
    road?: string;
    city?: string;
    town?: string;
    village?: string;
    suburb?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
}

export default function AddressAutocomplete({ value, onChange, placeholder }: AddressAutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchSuggestions = async (searchQuery: string) => {
    if (searchQuery.length < 3) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5&addressdetails=1`,
        {
          headers: {
            'Accept-Language': 'en-US,en;q=0.9',
          },
        }
      );
      const data = await response.json();
      setSuggestions(data);
      setShowSuggestions(true);
    } catch (error) {
      console.error('[DEBUG_LOG] Error fetching address suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const timeoutRef = useRef<any>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setQuery(newValue);
    onChange(newValue);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      fetchSuggestions(newValue);
    }, 500);
  };

  const handleSelect = (suggestion: Suggestion) => {
    let formattedAddress = suggestion.display_name;

    if (suggestion.address) {
      const addr = suggestion.address;
      const street = [addr.house_number, addr.road].filter(Boolean).join(' ');
      const city = addr.city || addr.town || addr.village || addr.suburb || '';
      const state = addr.state || '';
      const postcode = addr.postcode || '';
      const country = addr.country || '';

      const lines = [];
      if (street) lines.push(street);
      
      const cityStateZip = [city, state, postcode].filter(Boolean).join(', ');
      if (cityStateZip) lines.push(cityStateZip);
      
      if (country) lines.push(country);

      formattedAddress = lines.join('\n');
    }

    setQuery(formattedAddress);
    onChange(formattedAddress);
    setShowSuggestions(false);
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <textarea
        value={query}
        onChange={handleInputChange}
        placeholder={placeholder}
        rows={3}
        className="w-full bg-[#0D0F14] border border-[#1E2330] rounded-lg px-3 py-2 text-sm text-white placeholder-[#4B5563] focus:outline-none focus:border-[#10B981]/50 transition-colors resize-none"
        maxLength={500}
      />
      {loading && (
        <div className="absolute right-3 top-3">
          <div className="w-4 h-4 border-2 border-[#10B981]/30 border-t-[#10B981] rounded-full animate-spin" />
        </div>
      )}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-[100] w-full mt-1 bg-[#161B22] border border-[#30363D] rounded-lg shadow-2xl overflow-hidden">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.place_id}
              onClick={() => handleSelect(suggestion)}
              className="w-full text-left px-4 py-3 text-sm text-[#C9D1D9] hover:bg-[#1E2330] border-b border-[#30363D] last:border-0 transition-colors"
            >
              {suggestion.display_name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
