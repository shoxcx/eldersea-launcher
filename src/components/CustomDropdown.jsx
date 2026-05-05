import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

const CustomDropdown = ({ value, onChange, options, label }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className="custom-dropdown" ref={dropdownRef} style={{ position: 'relative', width: '100%' }}>
      <div 
        className="dropdown-header"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          padding: '12px 16px',
          background: 'rgba(0,0,0,0.3)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          color: 'var(--text-primary)',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          transition: 'all 0.3s ease',
          fontSize: '14px',
          fontWeight: 500,
          borderWidth: isOpen ? '1px' : '1px',
          borderColor: isOpen ? 'var(--purple)' : 'var(--border)',
          boxShadow: isOpen ? '0 0 15px rgba(212,175,55,0.1)' : 'none'
        }}
      >
        <span>{selectedOption ? selectedOption.label : 'Select...'}</span>
        <ChevronDown 
          size={16} 
          style={{ 
            transition: 'transform 0.3s ease', 
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0)',
            color: isOpen ? 'var(--purple)' : 'var(--text-dim)'
          }} 
        />
      </div>

      {isOpen && (
        <div className="dropdown-list fade-in" style={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          left: 0,
          right: 0,
          background: 'var(--bg-panel)',
          border: '1px solid var(--border-bright)',
          borderRadius: '12px',
          overflow: 'hidden',
          zIndex: 1000,
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          animation: 'dropdownIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
          {options.map((opt) => (
            <div
              key={opt.value}
              className="dropdown-item"
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              style={{
                padding: '12px 16px',
                cursor: 'pointer',
                fontSize: '13px',
                color: value === opt.value ? 'var(--purple-light)' : 'var(--text-primary)',
                background: value === opt.value ? 'rgba(212,175,55,0.1)' : 'transparent',
                transition: 'all 0.2s ease',
                fontWeight: value === opt.value ? 700 : 400,
                borderLeft: value === opt.value ? '3px solid var(--purple)' : '3px solid transparent'
              }}
              onMouseEnter={(e) => {
                if (value !== opt.value) e.target.style.background = 'rgba(255,255,255,0.03)';
              }}
              onMouseLeave={(e) => {
                if (value !== opt.value) e.target.style.background = 'transparent';
              }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes dropdownIn {
          from { opacity: 0; transform: translateY(-10px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}} />
    </div>
  );
};

export default CustomDropdown;
