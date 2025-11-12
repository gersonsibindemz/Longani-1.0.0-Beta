import React from 'react';

export const WaveformIcon: React.FC<{className?: string}> = ({className}) => (
  <span className={`inline-block ${className || ''}`}>
    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 26 26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" overflow="visible">
      <path d="M2 12h3l3-9 4 18 4-12 3 6h3" />
    </svg>
  </span>
);

export const UploadIcon: React.FC<{className?: string}> = ({className}) => (
  <span className={`inline-block ${className || ''}`}>
    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 26 26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" overflow="visible">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  </span>
);

export const ArrowRightIcon: React.FC<{className?: string}> = ({className}) => (
  <span className={`inline-block ${className || ''}`}>
    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 26 26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" overflow="visible">
        <line x1="5" y1="12" x2="19" y2="12" />
        <polyline points="12 5 19 12 12 19" />
    </svg>
  </span>
);

export const ArrowLeftIcon: React.FC<{className?: string}> = ({className}) => (
  <span className={`inline-block ${className || ''}`}>
    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 26 26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" overflow="visible">
        <line x1="19" y1="12" x2="5" y2="12" />
        <polyline points="12 19 5 12 12 5" />
    </svg>
  </span>
);

export const ClipboardIcon: React.FC<{className?: string}> = ({className}) => (
  <span className={`inline-block ${className || ''}`}>
    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 26 26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" overflow="visible">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    </svg>
  </span>
);

export const CheckIcon: React.FC<{className?: string}> = ({className}) => (
  <span className={`inline-block ${className || ''}`}>
    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 26 26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" overflow="visible">
        <polyline points="20 6 9 17 4 12" />
    </svg>
  </span>
);

export const ClockIcon: React.FC<{className?: string}> = ({className}) => (
  <span className={`inline-block ${className || ''}`}>
    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 26 26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" overflow="visible">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
    </svg>
  </span>
);

export const TargetIcon: React.FC<{className?: string}> = ({className}) => (
  <span className={`inline-block ${className || ''}`}>
    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 26 26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" overflow="visible">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" />
    </svg>
  </span>
);

export const InfoIcon: React.FC<React.HTMLAttributes<HTMLSpanElement>> = ({className, ...rest}) => (
  <span className={`inline-block ${className || ''}`} {...rest}>
    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 26 26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" overflow="visible">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  </span>
);

export const ReloadIcon: React.FC<{className?: string}> = ({className}) => (
  <span className={`inline-block ${className || ''}`}>
    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 26 26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" overflow="visible">
        <path d="M23 4v6h-6"/>
        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
    </svg>
  </span>
);

export const ColumnsIcon: React.FC<{className?: string}> = ({className}) => (
  <span className={`inline-block ${className || ''}`}>
    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 26 26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" overflow="visible">
        <path d="M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7m0-18H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h7m0-18v18"/>
    </svg>
  </span>
);

export const HistoryIcon: React.FC<{className?: string}> = ({className}) => (
  <span className={`inline-block ${className || ''}`}>
    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 26 26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" overflow="visible">
        <path d="M3 3v5h5"/>
        <path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/>
        <path d="M12 7v5l4 2"/>
    </svg>
  </span>
);

export const StarIcon: React.FC<{className?: string}> = ({className}) => (
  <span className={`inline-block ${className || ''}`}>
    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 26 26" fill="currentColor" overflow="visible">
        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
    </svg>
  </span>
);

export const StarOutlineIcon: React.FC<{className?: string}> = ({className}) => (
    <span className={`inline-block ${className || ''}`}>
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" viewBox="-1 -1 26 26" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" overflow="visible">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      </svg>
    </span>
  );

export const ThumbsUpIcon: React.FC<{className?: string}> = ({className}) => (
  <span className={`inline-block ${className || ''}`}>
    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 26 26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" overflow="visible">
      <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
    </svg>
  </span>
);

export const ThumbsDownIcon: React.FC<{className?: string}> = ({className}) => (
  <span className={`inline-block ${className || ''}`}>
    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 26 26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" overflow="visible">
      <path d="M10 15v-5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 2H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h3" />
    </svg>
  </span>
);

export const CloseIcon: React.FC<{className?: string}> = ({className}) => (
  <span className={`inline-block ${className || ''}`}>
    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 26 26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" overflow="visible">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  </span>
);

export const SunIcon: React.FC<{className?: string}> = ({className}) => (
  <span className={`inline-block ${className || ''}`}>
    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 26 26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" overflow="visible">
        <circle cx="12" cy="12" r="5" />
        <line x1="12" y1="1" x2="12" y2="3" />
        <line x1="12" y1="21" x2="12" y2="23" />
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
        <line x1="1" y1="12" x2="3" y2="12" />
        <line x1="21" y1="12" x2="23" y2="12" />
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  </span>
);

export const MoonIcon: React.FC<{className?: string}> = ({className}) => (
  <span className={`inline-block ${className || ''}`}>
    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 26 26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" overflow="visible">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  </span>
);

export const SystemIcon: React.FC<{className?: string}> = ({className}) => (
  <span className={`inline-block ${className || ''}`}>
    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 26 26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" overflow="visible">
        <rect x="3" y="3" width="18" height="12" rx="2" ry="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="15" x2="12" y2="21" />
    </svg>
  </span>
);

export const ChevronDownIcon: React.FC<{className?: string}> = ({className}) => (
  <span className={`inline-block ${className || ''}`}>
    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 26 26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" overflow="visible">
        <polyline points="6 9 12 15 18 9" />
    </svg>
  </span>
);

export const MenuIcon: React.FC<{className?: string}> = ({className}) => (
  <span className={`inline-block ${className || ''}`}>
    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 26 26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" overflow="visible">
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  </span>
);

export const UserIcon: React.FC<{className?: string}> = ({className}) => (
  <span className={`inline-block ${className || ''}`}>
    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 26 26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" overflow="visible">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
    </svg>
  </span>
);

export const UsersIcon: React.FC<React.HTMLAttributes<HTMLSpanElement>> = ({className, ...rest}) => (
    <span className={`inline-block ${className || ''}`} {...rest}>
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 26 26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" overflow="visible">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    </span>
);

export const TrashIcon: React.FC<{className?: string}> = ({className}) => (
  <span className={`inline-block ${className || ''}`}>
    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 26 26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" overflow="visible">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  </span>
);

export const MicrophoneIcon: React.FC<{className?: string}> = ({className}) => (
  <span className={`inline-block ${className || ''}`}>
    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 26 26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" overflow="visible">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
        <line x1="12" y1="19" x2="12" y2="23"/>
        <line x1="8" y1="23" x2="16" y2="23"/>
    </svg>
  </span>
);

export const StopIcon: React.FC<{className?: string}> = ({className}) => (
  <span className={`inline-block ${className || ''}`}>
    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 26 26" fill="currentColor" overflow="visible">
        <circle cx="12" cy="12" r="10" />
    </svg>
  </span>
);

export const SparkleIcon: React.FC<{className?: string}> = ({className}) => (
  <span className={`inline-block ${className || ''}`}>
    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 26 26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" overflow="visible">
        <path d="M12 2L9.09 8.26 2 9.27l5 4.87-1.18 6.88L12 17.77l6.18 3.25L17 14.14l5-4.87-7.09-1.01L12 2zM2 12l5 4.87-1.18 6.88L12 17.77l6.18 3.25L17 14.14l5-4.87"/>
    </svg>
  </span>
);

export const PlayIcon: React.FC<{className?: string}> = ({className}) => (
  <span className={`inline-block ${className || ''}`}>
    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 26 26" fill="currentColor" overflow="visible">
      <path d="M8 5v14l11-7z" />
    </svg>
  </span>
);

export const PauseIcon: React.FC<{className?: string}> = ({className}) => (
  <span className={`inline-block ${className || ''}`}>
    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 26 26" fill="currentColor" overflow="visible">
      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
    </svg>
  </span>
);

export const SearchIcon: React.FC<{className?: string}> = ({className}) => (
    <span className={`inline-block ${className || ''}`}>
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 26 26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" overflow="visible">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    </span>
  );

export const ZoomInIcon: React.FC<{className?: string}> = ({className}) => (
  <span className={`inline-block ${className || ''}`}>
    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 26 26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" overflow="visible">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
      <line x1="11" y1="8" x2="11" y2="14" />
      <line x1="8" y1="11" x2="14" y2="11" />
    </svg>
  </span>
);

export const ZoomOutIcon: React.FC<{className?: string}> = ({className}) => (
  <span className={`inline-block ${className || ''}`}>
    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 26 26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" overflow="visible">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
      <line x1="8" y1="11" x2="14" y2="11" />
    </svg>
  </span>
);

export const MoreVerticalIcon: React.FC<{className?: string}> = ({className}) => (
    <span className={`inline-block ${className || ''}`}>
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 26 26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" overflow="visible">
        <circle cx="12" cy="12" r="1" />
        <circle cx="12" cy="5" r="1" />
        <circle cx="12" cy="19" r="1" />
      </svg>
    </span>
  );
  
export const EditIcon: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <span className={`inline-block ${className || ''}`}>
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 26 26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" overflow="visible">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
    </span>
  );
};

export const TranslateIcon: React.FC<{className?: string}> = ({className}) => (
  <span className={`inline-block ${className || ''}`}>
    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 26 26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" overflow="visible">
        <path d="M5 12h14M12 5c-4.4 0-8 3.6-8 8s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8z"/>
        <path d="M12 22c-3.5 0-6.6-2-8-5M12 2c3.5 0 6.6 2 8 5"/>
        <path d="M8 5c.5-1.5 1.5-2.8 3-3.5"/>
        <path d="M16 19c-.5 1.5-1.5 2.8-3 3.5"/>
    </svg>
  </span>
);

export const SaveIcon: React.FC<{className?: string}> = ({className}) => (
  <span className={`inline-block ${className || ''}`}>
    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 26 26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" overflow="visible">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  </span>
);

export const CameraIcon: React.FC<{className?: string}> = ({className}) => (
  <span className={`inline-block ${className || ''}`}>
    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 26 26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" overflow="visible">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  </span>
);

export const SmartphoneIcon: React.FC<{className?: string}> = ({className}) => (
  <span className={`inline-block ${className || ''}`}>
    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 26 26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" overflow="visible">
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
      <line x1="12" y1="18" x2="12.01" y2="18"></line>
    </svg>
  </span>
);

export const TabletIcon: React.FC<{className?: string}> = ({className}) => (
  <span className={`inline-block ${className || ''}`}>
    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 26 26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" overflow="visible">
      <rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect>
      <line x1="12" y1="18" x2="12.01" y2="18"></line>
    </svg>
  </span>
);

export const CreditCardIcon: React.FC<{className?: string}> = ({className}) => (
    <span className={`inline-block ${className || ''}`}>
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 26 26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" overflow="visible">
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <line x1="2" y1="10" x2="22" y2="10" />
      </svg>
    </span>
);

export const FolderIcon: React.FC<{className?: string}> = ({className}) => (
    <span className={`inline-block ${className || ''}`}>
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 26 26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" overflow="visible">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
      </svg>
    </span>
);

export const EyeIcon: React.FC<{className?: string}> = ({className}) => (
    <span className={`inline-block ${className || ''}`}>
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 26 26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" overflow="visible">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    </span>
  );
  
  export const EyeOffIcon: React.FC<{className?: string}> = ({className}) => (
    <span className={`inline-block ${className || ''}`}>
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 26 26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" overflow="visible">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </svg>
    </span>
  );
  
export const GoogleIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48px" height="48px">
        <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
        <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
        <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.222,0-9.519-3.536-11.088-8.239l-6.587,4.82C9.524,39.576,16.227,44,24,44z"/>
        <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.574l6.19,5.238C42.022,35.599,44,30.035,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
    </svg>
);
