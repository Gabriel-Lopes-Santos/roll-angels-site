import React, { useState, useRef, useEffect } from 'react';

export default function Combobox({ 
  options, 
  value, 
  onChange, 
  placeholder = "Selecione ou digite abaixo...",
  disabled = false,
  displayKey = "name_pt",
  fallbackKey = "name",
  valueKey = "id", // what we actually return
  emptyText = "Nenhuma opção encontrada"
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef(null);

  // Find the selected option's label to display in the input
  const selectedOption = options.find(o => o[valueKey] == value);
  const displayValue = selectedOption ? (selectedOption[displayKey] || selectedOption[fallbackKey]) : '';

  useEffect(() => {
    setSearchTerm(displayValue);
  }, [displayValue]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
        // Se fechou sem clicar, reseta o searchTerm para o original
        setSearchTerm(displayValue);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef, displayValue]);

  const filteredOptions = options.filter(option => {
    const label = (option[displayKey] || option[fallbackKey] || '').toLowerCase();
    return label.includes(searchTerm.toLowerCase());
  });

  const handleSelect = (option) => {
    onChange(option[valueKey]);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${disabled ? 'opacity-50 pointer-events-none' : ''}`} ref={wrapperRef}>
      <input
        type="text"
        className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 placeholder-neutral-500"
        placeholder={placeholder}
        value={isOpen ? searchTerm : displayValue}
        onChange={(e) => {
          setSearchTerm(e.target.value);
          if (!isOpen) setIsOpen(true);
        }}
        onClick={() => setIsOpen(true)}
        disabled={disabled}
      />
      {/* Seta para baixo visual */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-500">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-neutral-900 border border-neutral-700 rounded-lg shadow-2xl max-h-60 overflow-y-auto">
          {filteredOptions.length === 0 ? (
            <div className="p-3 text-neutral-500 text-sm">{emptyText}</div>
          ) : (
            filteredOptions.map((opt) => {
              const isSelected = opt[valueKey] == value;
              return (
                <div
                  key={opt[valueKey]}
                  onClick={() => handleSelect(opt)}
                  className={`px-4 py-2 text-sm cursor-pointer transition-colors
                    ${isSelected ? 'bg-purple-600/30 text-purple-200' : 'text-neutral-300 hover:bg-purple-600/20 hover:text-white'}`}
                >
                  {opt[displayKey] || opt[fallbackKey]}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
