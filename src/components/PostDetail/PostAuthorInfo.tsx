import Avatar from '@/components/Avatar';

interface PostAuthorInfoProps {
  author: {
    full_name: string | null;
    email: string;
    avatar_url: string | null;
    specialty: string | null;
    country: string | null;
  };
  createdAt: string;
}

function getInitials(fullName: string | null, email: string): string {
  if (fullName && fullName.trim()) {
    const words = fullName.trim().split(' ').filter(w => w.length > 0);
    if (words.length >= 2) {
      return (words[0][0] + words[words.length - 1][0]).toUpperCase();
    }
    return fullName.substring(0, 2).toUpperCase();
  }
  return email.substring(0, 2).toUpperCase();
}

export default function PostAuthorInfo({ author, createdAt }: PostAuthorInfoProps) {
  const displayName = author.full_name || author.email || 'Autor anónimo';
  
  return (
    <div className="flex items-start gap-3 sm:gap-4">
      <div className="p-0.5 sm:p-1 rounded-full flex-shrink-0" style={{ backgroundColor: '#b3015a' }}>
        <Avatar
          src={author.avatar_url || null}
          alt={displayName}
          size="md"
          fallbackText={getInitials(author.full_name, author.email)}
        />
      </div>
      <div className="flex flex-col gap-0.5 sm:gap-1 min-w-0">
        <h2 className="text-base sm:text-lg font-semibold text-gray-900">
          {displayName}
        </h2>
        
        {author.specialty && (
          <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-700">
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span className="font-medium truncate">{author.specialty}</span>
          </div>
        )}
        
        {author.country && (
          <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-600">
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="truncate">{author.country}</span>
          </div>
        )}
        
        <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1">
          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="truncate">
            {new Date(createdAt).toLocaleDateString('es-ES', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </span>
        </div>
      </div>
    </div>
  );
}