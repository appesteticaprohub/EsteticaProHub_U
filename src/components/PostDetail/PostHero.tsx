import PostAuthorInfo from './PostAuthorInfo';

interface PostHeroProps {
  title: string;
  category?: string; // NUEVO: Categoría del post
  author?: {
    full_name: string | null;
    email: string;
    avatar_url: string | null;
    specialty: string | null;
    country: string | null;
  };
  createdAt: string;
  subscriptionStatus?: string | null;
  onResolvePayment?: () => void;
}

export default function PostHero({
  title,
  category,
  author,
  createdAt,
  subscriptionStatus,
  onResolvePayment
}: PostHeroProps) {
  // Función para obtener color según categoría
  const getCategoryInfo = (category?: string) => {
    if (!category) return null;
    
    const categories: Record<string, { label: string; color: string; bg: string }> = {
      'casos-clinicos': { 
        label: 'Casos Clínicos',
        color: 'text-blue-700', 
        bg: 'bg-blue-50'
      },
      'complicaciones': { 
        label: 'Complicaciones',
        color: 'text-red-700', 
        bg: 'bg-red-50'
      },
      'tendencias-facial': { 
        label: 'Tendencias Facial',
        color: 'text-purple-700', 
        bg: 'bg-purple-50'
      },
      'tendencias-corporal': { 
        label: 'Tendencias Corporal',
        color: 'text-pink-700', 
        bg: 'bg-pink-50'
      },
      'tendencias-capilar': { 
        label: 'Tendencias Capilar',
        color: 'text-indigo-700', 
        bg: 'bg-indigo-50'
      },
      'tendencias-spa': { 
        label: 'Tendencias Spa',
        color: 'text-teal-700', 
        bg: 'bg-teal-50'
      },
      'gestion-empresarial': { 
        label: 'Gestión Empresarial',
        color: 'text-orange-700', 
        bg: 'bg-orange-50'
      },
    };
    
    return categories[category] || { label: category, color: 'text-gray-700', bg: 'bg-gray-50' };
  };

  const categoryInfo = getCategoryInfo(category);
  return (
    <header className="mb-8">
      {/* Indicador de estado de suscripción */}
      {subscriptionStatus && (
        <div className="mb-6">
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            subscriptionStatus === 'Active' ? 'bg-green-100 text-green-800' :
            subscriptionStatus === 'Grace_Period' ? 'bg-yellow-100 text-yellow-800' :
            subscriptionStatus === 'Payment_Failed' ? 'bg-orange-100 text-orange-800' :
            subscriptionStatus === 'Suspended' ? 'bg-red-100 text-red-800' :
            subscriptionStatus === 'Expired' ? 'bg-gray-100 text-gray-800' :
            subscriptionStatus === 'Cancelled' ? 'bg-red-100 text-red-800' :
            subscriptionStatus === 'Price_Change_Cancelled' ? 'bg-red-100 text-red-800' :
            'bg-gray-50 text-gray-600'
          }`}>
            <div className={`w-2 h-2 rounded-full mr-2 ${
              subscriptionStatus === 'Active' ? 'bg-green-400' :
              subscriptionStatus === 'Grace_Period' ? 'bg-yellow-400' :
              subscriptionStatus === 'Payment_Failed' ? 'bg-orange-400' :
              subscriptionStatus === 'Suspended' ? 'bg-red-400' :
              subscriptionStatus === 'Expired' ? 'bg-gray-400' :
              subscriptionStatus === 'Cancelled' ? 'bg-red-400' :
              subscriptionStatus === 'Price_Change_Cancelled' ? 'bg-red-400' :
              'bg-gray-300'
            }`}></div>
            Suscripción: {
              subscriptionStatus === 'Active' ? 'Activa' :
              subscriptionStatus === 'Grace_Period' ? 'Período de Gracia' :
              subscriptionStatus === 'Payment_Failed' ? 'Problema de Pago' :
              subscriptionStatus === 'Suspended' ? 'Suspendida' :
              subscriptionStatus === 'Expired' ? 'Expirada' :
              subscriptionStatus === 'Cancelled' ? 'Cancelada' :
              subscriptionStatus === 'Price_Change_Cancelled' ? 'Cancelada por Cambio de Precio' :
              subscriptionStatus
            }
            {(subscriptionStatus === 'Payment_Failed' || 
              subscriptionStatus === 'Grace_Period' || 
              subscriptionStatus === 'Suspended') && onResolvePayment && (
              <button
                onClick={onResolvePayment}
                className="ml-2 text-xs underline hover:no-underline"
              >
                Resolver
              </button>
            )}
          </div>
        </div>
      )}
      
      <div className="bg-white shadow-md border-t-4 border-purple-500 rounded-lg px-4 sm:px-6 py-4 sm:py-5 mb-6">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 leading-tight mb-3">
          {title}
        </h1>
        
        {/* Etiqueta de Categoría */}
        {categoryInfo && (
          <span className={`inline-block px-3 py-1.5 ${categoryInfo.bg} ${categoryInfo.color} rounded-md text-xs font-semibold`}>
            {categoryInfo.label}
          </span>
        )}
      </div>
      
      {/* Información del autor */}
      {author ? (
        <div className="mb-6">
          <PostAuthorInfo author={author} createdAt={createdAt} />
        </div>
      ) : (
        <div className="mb-6 text-sm text-gray-500">
          {new Date(createdAt).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </div>
      )}
    </header>
  );
}