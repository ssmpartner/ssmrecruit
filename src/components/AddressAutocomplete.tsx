import { useState, useCallback, useRef, useEffect } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

export interface AddressSuggestion {
  fullAddress: string;
  street: string;
  plz: string;
  city: string;
  canton: string;
  cantonCode: string;
  coordinates: [number, number];
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (suggestion: AddressSuggestion) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export default function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = 'Adresse suchen...',
  className,
  disabled,
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('geocode-address', {
        body: { query, types: 'address,place' },
      });
      if (error) throw error;
      const items = data?.suggestions || [];
      setSuggestions(items);
      setIsOpen(items.length > 0);
    } catch (err) {
      console.error('Address autocomplete error:', err);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (val: string) => {
    onChange(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 300);
  };

  const handleSelect = (s: AddressSuggestion) => {
    onSelect(s);
    setIsOpen(false);
    setSuggestions([]);
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <input
          value={value}
          onChange={e => handleChange(e.target.value)}
          onFocus={() => suggestions.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "h-10 w-full rounded-md border border-input bg-background pl-8 pr-8 text-sm outline-none focus:ring-2 focus:ring-ring transition-colors",
            className
          )}
        />
        {loading && (
          <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground animate-spin" />
        )}
      </div>
      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border bg-popover shadow-lg max-h-48 overflow-y-auto">
          {suggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              onMouseDown={e => { e.preventDefault(); handleSelect(s); }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex items-start gap-2"
            >
              <MapPin className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <div className="font-medium truncate">{s.street}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {s.plz} {s.city}{s.cantonCode ? ` (${s.cantonCode})` : ''}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
