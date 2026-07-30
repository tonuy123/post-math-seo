import { User } from 'lucide-react';

export function Avatar({ src, alt, size = 'md', className = '' }) {
  const sizeClass = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-[60px] h-[60px]',
    xl: 'w-[100px] h-[100px]',
  }[size];

  return (
    <div className={`${sizeClass} rounded-full bg-wp-gray overflow-hidden flex items-center justify-center text-gray-400 border border-wp-gray-dark ${className}`}>
      {src ? (
        <img src={src} alt={alt || 'avatar'} className="w-full h-full object-cover" />
      ) : (
        <User size={size === 'xl' ? 50 : size === 'lg' ? 32 : size === 'md' ? 24 : 18} />
      )}
    </div>
  );
}