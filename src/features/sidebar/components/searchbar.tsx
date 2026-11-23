'use client';

import { useState, type FC, type ReactNode } from 'react';
import { Clock3, MapPin, Search, X } from 'lucide-react';

interface SearchBarProps {
  onSearch: (query: string) => void;
}

const SearchBar: FC<SearchBarProps> = ({ onSearch }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const suggestions = ['Cagayan de Oro City', 'Divisoria', 'SM City CDO Uptown'];
  const recents = ['Gaisano Mall', 'Gingoog City'];

  const handleSubmit = () => {
    const query = searchQuery.trim();
    if (query) {
      onSearch(query);
      setIsOpen(false);
    }
  };

  const handleClear = () => {
    setSearchQuery('');
    onSearch('');
    setIsOpen(false);
  };

  return (
    <div
      className="relative w-full"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setIsOpen(false);
        }
      }}
    >
      <form
        className="flex h-14 items-center rounded-full border border-border/60 bg-background text-sm shadow-lg pl-1 pr-1"
        onSubmit={(event) => {
          event.preventDefault();
          handleSubmit();
        }}
      >

        <input
          type="text"
          value={searchQuery}
          onChange={(event) => {
            setSearchQuery(event.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search places, addresses, or landmarks"
          className="min-w-0 flex-1 px-3 py-4 bg-transparent placeholder:text-xs focus:outline-none"
          aria-label="Search locations"
        />
        <button
          type="submit"
          className="grid size-10 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted"
          aria-label="Search"
        >
          <Search className="size-4.5" />
        </button>

        <button
          type="button"
          onClick={handleClear}
          className="grid size-10 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted"
          aria-label="Clear search"
        >
          <X className="size-4.5" />
        </button>
      </form>

      {isOpen && (
        <div className="mt-2 overflow-hidden rounded-2xl border border-border/60 bg-background shadow-lg">
          <SuggestionSection
            title="Suggested"
            items={suggestions}
            icon={<MapPin className="size-4" />}
            onSelect={(item) => {
              setSearchQuery(item);
              onSearch(item);
              setIsOpen(false);
            }}
          />
          <SuggestionSection
            title="Recent"
            items={recents}
            icon={<Clock3 className="size-4" />}
            onSelect={(item) => {
              setSearchQuery(item);
              onSearch(item);
              setIsOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
};

function SuggestionSection({
  title,
  items,
  icon,
  onSelect,
}: {
  title: string;
  items: string[];
  icon: ReactNode;
  onSelect: (item: string) => void;
}) {
  return (
    <div className="py-2">
      <p className="px-4 py-2 text-xs font-medium text-muted-foreground">{title}</p>
      {items.map((item) => (
        <button
          key={item}
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onSelect(item)}
          className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-muted"
        >
          <span className="grid size-8 place-items-center rounded-full bg-muted text-muted-foreground">
            {icon}
          </span>
          <span>{item}</span>
        </button>
      ))}
    </div>
  );
}

export default SearchBar;