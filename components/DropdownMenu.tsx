import React, { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon } from './Icons';

// A simpler interface for options within a submenu.
interface SubmenuOption {
  label: string;
  onClick: () => void;
  className?: string;
}

// The main option type, now supporting an optional submenu.
// `onClick` is also optional to allow parent items to act only as triggers.
interface DropdownOption {
  label: string;
  icon: React.ReactNode;
  onClick?: () => void;
  className?: string;
  submenu?: SubmenuOption[];
  disabled?: boolean;
}

interface DropdownMenuProps {
  trigger: React.ReactNode;
  options: DropdownOption[];
}

export const DropdownMenu: React.FC<DropdownMenuProps> = ({ trigger, options }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const [activeSubmenu, setActiveSubmenu] = useState<{ items: SubmenuOption[]; position: React.CSSProperties } | null>(null);
  const submenuTimeoutRef = useRef<number | null>(null);

  // Effect to close the dropdown when clicking outside of it.
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setActiveSubmenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Safely handles clicks on options, ensuring an onClick function exists.
  const handleOptionClick = (option: DropdownOption) => {
    if (option.onClick && !option.disabled) {
        option.onClick();
        setIsOpen(false);
        setActiveSubmenu(null);
    }
  };
  
  // Handlers for showing/hiding submenus with a slight delay for better UX.
  const handleSubmenuEnter = (option: DropdownOption, target: HTMLElement) => {
    if (!option.submenu || option.disabled) return;
    if (submenuTimeoutRef.current) clearTimeout(submenuTimeoutRef.current);

    const mainDropdown = dropdownRef.current?.querySelector('[role="menu"]')?.parentElement;
    if (!mainDropdown) return;

    const itemRect = target.getBoundingClientRect();
    const mainDropdownRect = mainDropdown.getBoundingClientRect();
    const screenWidth = window.innerWidth;
    const submenuWidth = 224; // w-56
    const mobileBreakpoint = 640; // sm breakpoint in Tailwind

    let position: React.CSSProperties = {};

    if (screenWidth < mobileBreakpoint) {
        // On smaller screens, open above the main menu.
        position = {
            bottom: '100%',
            right: 0,
            marginBottom: '0.25rem',
        };
    } else {
        // On larger screens, open to the side of the menu item.
        const top = itemRect.top - mainDropdownRect.top;
        if (itemRect.right + submenuWidth > screenWidth && itemRect.left - submenuWidth > 0) {
            // Open left
            position = { top, right: '100%', marginRight: '0.25rem' };
        } else {
            // Open right
            position = { top, left: '100%', marginLeft: '0.25rem' };
        }
    }
    
    setActiveSubmenu({ items: option.submenu, position });
  };

  const handleSubmenuLeave = () => {
    submenuTimeoutRef.current = window.setTimeout(() => {
        setActiveSubmenu(null);
    }, 200);
  };

  const activeSubmenuItems = activeSubmenu?.items;

  return (
    <div className="relative" ref={dropdownRef}>
      <div
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
          // Always clear submenu when toggling main menu
          setActiveSubmenu(null);
        }}
        role="button"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        {trigger}
      </div>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-20 animate-fade-in-down">
          <div className="py-1" role="menu" aria-orientation="vertical" onMouseLeave={handleSubmenuLeave}>
            {options.map((option) => (
              <div 
                key={option.label}
                onMouseEnter={(e) => handleSubmenuEnter(option, e.currentTarget)}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    // Only trigger click for items that are not submenu parents.
                    if (!option.submenu) {
                        handleOptionClick(option);
                    }
                  }}
                  disabled={option.disabled}
                  className={`w-full flex items-center justify-between gap-3 px-4 py-2 text-sm text-left ${option.className || 'text-gray-700 dark:text-gray-200'} hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed`}
                  role="menuitem"
                >
                  <span className="flex items-center gap-3">
                    {option.icon}
                    <span>{option.label}</span>
                  </span>
                  {option.submenu && (
                    <ChevronDownIcon className="w-4 h-4 transform -rotate-90" />
                  )}
                </button>
              </div>
            ))}
          </div>

          {activeSubmenuItems && (
            <div
                style={activeSubmenu?.position}
                className="absolute w-56 bg-white dark:bg-gray-800 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-30 animate-fade-in"
                onMouseEnter={() => { if (submenuTimeoutRef.current) clearTimeout(submenuTimeoutRef.current); }}
                onMouseLeave={handleSubmenuLeave}
            >
                <div className="py-1" role="menu">
                    {activeSubmenuItems.map(subOption => (
                        <button
                            key={subOption.label}
                            onClick={(e) => {
                                e.stopPropagation();
                                handleOptionClick({ label: subOption.label, icon: <></>, onClick: subOption.onClick });
                            }}
                            className={`w-full text-left flex items-center gap-3 px-4 py-2 text-sm ${subOption.className || 'text-gray-700 dark:text-gray-200'} hover:bg-gray-100 dark:hover:bg-gray-700`}
                            role="menuitem"
                        >
                            <span>{subOption.label}</span>
                        </button>
                    ))}
                </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
