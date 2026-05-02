import { Client } from '@/types/girilog';

interface ClientAvatarProps {
  client: Pick<Client, 'id' | 'name' | 'logo_url'>;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  fallbackClassName?: string;
}

const AVATAR_COLORS = [
  'bg-primary/20 text-primary',
  'bg-[#F59E0B]/20 text-[#F59E0B]',
  'bg-[#8B5CF6]/20 text-[#8B5CF6]',
  'bg-[#EC4899]/20 text-[#EC4899]',
  'bg-[#06B6D4]/20 text-[#06B6D4]',
];

const SIZES = {
  xs: 'w-7 h-7 rounded-lg text-[10px]',
  sm: 'w-9 h-9 rounded-xl text-xs',
  md: 'w-11 h-11 rounded-xl text-sm',
  lg: 'w-14 h-14 rounded-2xl text-lg',
  xl: 'w-16 h-16 rounded-2xl text-xl',
};

function getInitials(name: string) {
  if (!name) return '??';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export default function ClientAvatar({ client, size = 'md', className = '', fallbackClassName = '' }: ClientAvatarProps) {
  const colorClass = AVATAR_COLORS[client.id % AVATAR_COLORS.length];
  const sizeClass = SIZES[size];
  const initials = getInitials(client.name);

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const target = e.target as HTMLImageElement;
    target.style.display = 'none';
    const parent = target.parentElement;
    if (parent) {
      parent.classList.add(...colorClass.split(' '));
      const span = document.createElement('span');
      span.className = 'font-bold font-mono';
      span.innerText = initials;
      parent.appendChild(span);
    }
  };

  return (
    <div 
      className={`shrink-0 flex items-center justify-center overflow-hidden border border-[#1E2330] bg-[#0D0F14] ${sizeClass} ${!client.logo_url ? colorClass : ''} ${className}`}
    >
      {client.logo_url ? (
        <img
          src={client.logo_url}
          alt={client.name}
          className="w-full h-full object-contain p-1"
          onError={handleImageError}
        />
      ) : (
        <span className={`font-bold font-mono ${fallbackClassName}`}>
          {initials}
        </span>
      )}
    </div>
  );
}
