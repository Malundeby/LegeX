'use client';

import { useState, useRef, useEffect } from 'react';

interface ComboBoxProps {
  value: string | number;
  options: string[];
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  maxWidth?: string;
  initialHighlightValue?: string;
}

export default function ComboBox({
  value,
  options,
  onChange,
  placeholder = 'Velg eller skriv...',
  maxWidth = '200px',
  initialHighlightValue
}: ComboBoxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value?.toString() || '');
  const [filteredOptions, setFilteredOptions] = useState(options);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputValue(value?.toString() || '');
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getInitialHighlightIndex = (optionList: string[]) => {
    if (!inputValue && initialHighlightValue) {
      const index = optionList.findIndex((option) => option === initialHighlightValue);
      if (index >= 0) return index;
    }

    if (inputValue) {
      const selectedIndex = optionList.findIndex((option) => option === inputValue);
      if (selectedIndex >= 0) return selectedIndex;
    }

    return -1;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = e.target.value;
    setInputValue(nextValue);
    onChange(nextValue);

    if (nextValue) {
      const filtered = options.filter((option) =>
        option.toLowerCase().includes(nextValue.toLowerCase())
      );
      setFilteredOptions(filtered);
      setIsOpen(filtered.length > 0);
      setHighlightedIndex(-1);
      return;
    }

    setFilteredOptions(options);
    setIsOpen(true);
    setHighlightedIndex(getInitialHighlightIndex(options));
  };

  const handleOptionClick = (option: string) => {
    setInputValue(option);
    onChange(option);
    setIsOpen(false);
    setHighlightedIndex(-1);
    inputRef.current?.blur();
  };

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setFilteredOptions(options);
    setIsOpen(true);
    setHighlightedIndex(getInitialHighlightIndex(options));
    e.currentTarget.style.borderColor = '#0891b2';
    e.currentTarget.style.boxShadow = '0 0 0 4px rgba(8, 145, 178, 0.1), 0 1px 3px rgba(0, 0, 0, 0.1)';
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
        setFilteredOptions(options);
        setHighlightedIndex(getInitialHighlightIndex(options));
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          handleOptionClick(filteredOptions[highlightedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setHighlightedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const highlightedElement = listRef.current.children[highlightedIndex] as HTMLElement;
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: 'center', behavior: 'auto' });
      }
    }
  }, [highlightedIndex]);

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', maxWidth }}>
      <div
        style={{ position: 'relative', cursor: 'text' }}
        onClick={() => {
          if (!isOpen) {
            setIsOpen(true);
            setFilteredOptions(options);
            setHighlightedIndex(getInitialHighlightIndex(options));
          }
          inputRef.current?.focus();
        }}
      >
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-controls="combobox-listbox"
          style={{
            width: '100%',
            padding: '12px 44px 12px 16px',
            fontSize: '15px',
            border: '2px solid #e5e7eb',
            borderRadius: '10px',
            outline: 'none',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            backgroundColor: '#ffffff',
            color: '#111827',
            fontWeight: 500,
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
            cursor: 'text'
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = '#e5e7eb';
            e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
          }}
        />
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen((prev) => {
              const nextOpen = !prev;
              if (nextOpen) {
                setFilteredOptions(options);
                setHighlightedIndex(getInitialHighlightIndex(options));
                inputRef.current?.focus();
              }
              return nextOpen;
            });
          }}
          tabIndex={-1}
          aria-label={isOpen ? 'Lukk liste' : 'Åpne liste'}
          style={{
            position: 'absolute',
            right: '10px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '6px',
            fontSize: '16px',
            color: '#6b7280',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '6px',
            transition: 'all 0.2s ease',
            pointerEvents: 'auto'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.color = '#0891b2';
            e.currentTarget.style.backgroundColor = '#ecfeff';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.color = '#6b7280';
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="currentColor"
            style={{
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
            <path
              fillRule="evenodd"
              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>

      {isOpen && filteredOptions.length > 0 && (
        <div
          ref={listRef}
          id="combobox-listbox"
          role="listbox"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            maxHeight: '280px',
            overflowY: 'auto',
            backgroundColor: '#ffffff',
            border: '2px solid #e5e7eb',
            borderRadius: '10px',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05)',
            zIndex: 1000,
            animation: 'slideDown 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >
          <style jsx>{`
            @keyframes slideDown {
              from {
                opacity: 0;
                transform: translateY(-10px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }
            div::-webkit-scrollbar {
              width: 8px;
            }
            div::-webkit-scrollbar-track {
              background: #f3f4f6;
              border-radius: 10px;
            }
            div::-webkit-scrollbar-thumb {
              background: #d1d5db;
              border-radius: 10px;
            }
            div::-webkit-scrollbar-thumb:hover {
              background: #9ca3af;
            }
          `}</style>
          {filteredOptions.map((option, index) => {
            const isSelected = option === inputValue;
            const isHighlighted = index === highlightedIndex;
            return (
              <div
                key={index}
                role="option"
                aria-selected={isSelected}
                onClick={() => handleOptionClick(option)}
                onMouseEnter={() => setHighlightedIndex(index)}
                style={{
                  padding: '11px 16px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: isSelected ? '#0891b2' : '#111827',
                  backgroundColor: isHighlighted ? '#f0fdfa' : (isSelected ? '#ecfeff' : '#ffffff'),
                  fontWeight: isSelected ? 600 : 400,
                  borderLeft: isSelected ? '3px solid #0891b2' : '3px solid transparent',
                  transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <span>{option}</span>
                {isSelected && (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    style={{ flexShrink: 0, marginLeft: '8px' }}
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
