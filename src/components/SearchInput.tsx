import type { KeyboardEventHandler, Ref } from 'react';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onKeyDown?: KeyboardEventHandler<HTMLInputElement>;
  inputRef?: Ref<HTMLInputElement>;
  className?: string;
  id?: string;
}

export default function SearchInput({ value, onChange, placeholder = 'Search...', onKeyDown, inputRef, className = '', id }: SearchInputProps) {
  return (
    <div className={`search-input ${className}`.trim()}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
        <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <input
        id={id}
        ref={inputRef}
        type="search"
        inputMode="search"
        enterKeyHint="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        aria-label={placeholder}
        autoComplete="off"
      />
    </div>
  );
}
