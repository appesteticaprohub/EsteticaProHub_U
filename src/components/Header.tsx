'use client'

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/hooks/useNotifications';
import { useState, useRef, useEffect } from 'react';

// Formatear fecha usando componentes UTC directamente
const formatDateColombia = (utcDate: string) => {
  const date = new Date(utcDate);
  
  const day = date.getUTCDate();
  const month = date.toLocaleDateString('es-CO', { month: 'short', timeZone: 'UTC' });
  const hours = date.getUTCHours();
  const minutes = date.getUTCMinutes().toString().padStart(2, '0');
  const period = hours >= 12 ? 'p. m.' : 'a. m.';
  const displayHours = hours % 12 || 12;
  
  return `${day} de ${month}, ${displayHours}:${minutes} ${period}`;
};

export default function Header() {
  const { user, loading, signOut } = useAuth();
  const { notifications, unreadCount, markAsRead, refresh, isLoading: notificationsLoading } = useNotifications({ 
    limit: 5,
    enabled: !!user && !loading  // Solo llamar si hay usuario y no está cargando
  });
const [showNotifications, setShowNotifications] = useState(false);
const [hoveredButton, setHoveredButton] = useState<string | null>(null);
const dropdownRef = useRef<HTMLDivElement>(null);

// Cerrar dropdown al hacer click afuera
useEffect(() => {
  function handleClickOutside(event: MouseEvent) {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
      setShowNotifications(false);
    }
  }

  if (showNotifications) {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }
}, [showNotifications]);

const handleNotificationClick = async (notificationId: string, ctaUrl: string | null) => {
  await markAsRead(notificationId);
  setShowNotifications(false);
  if (ctaUrl) {
    window.location.href = ctaUrl;
  }
};

const getCategoryColor = (category: string) => {
  switch (category) {
    case 'critical': return 'bg-red-100 border-red-500';
    case 'important': return 'bg-yellow-100 border-yellow-500';
    case 'promotional': return 'bg-purple-100 border-purple-500';
    default: return 'bg-blue-100 border-blue-500';
  }
};

  return (
    <div className="w-full bg-white shadow-sm flex justify-between items-center h-16 py-4 px-4 md:px-6">
      <Link href="/" className="flex items-center">
        {/* Vista móvil: Logo apilado (ícono arriba, texto abajo) */}
        <div className="flex md:hidden flex-col items-center gap-1">
          <img 
            src="/logo.svg" 
            alt="EsteticaPro Hub" 
            className="h-8 w-auto"
          />
          <span className="text-xs font-semibold text-gray-700">EsteticaPro Hub</span>
        </div>
        
        {/* Vista desktop: Logo + texto horizontal */}
        <div className="hidden md:flex items-center gap-3">
          <img 
            src="/logo.svg" 
            alt="EsteticaPro Hub Logo" 
            className="h-10 w-auto"
          />
          <span className="font-semibold text-lg text-gray-800">EsteticaPro Hub</span>
        </div>
      </Link>
      <div className="flex gap-3 md:gap-4 items-center">
        {loading ? (
          <div className="bg-gray-300 text-gray-600 px-4 py-2 rounded-lg">
            Cargando...
          </div>
        ) : user ? (
          <>
            {/* Campana de notificaciones */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Notificaciones"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-gray-700"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Dropdown de notificaciones */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[500px] overflow-y-auto">
                  {/* Header con botón refrescar */}
                  <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="font-semibold text-gray-800">Notificaciones</h3>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        refresh();
                      }}
                      className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Refrescar notificaciones"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 text-gray-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                    </button>
                  </div>

                  {/* Link Ver todas - ARRIBA */}
                  {notifications.length > 0 && (
                    <div className="p-3 border-b border-gray-200 bg-gray-50">
                      <Link
                        href="/notificaciones"
                        className="block text-center text-sm text-blue-600 hover:text-blue-700 font-medium"
                        onClick={() => setShowNotifications(false)}
                      >
                        Ver todas las notificaciones →
                      </Link>
                    </div>
                  )}

                  {/* Lista de notificaciones */}
                  {notificationsLoading ? (
                    <div className="p-4 text-center text-gray-500">
                      Cargando...
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-12 w-12 mx-auto mb-2 text-gray-300"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                        />
                      </svg>
                      <p>No tienes notificaciones</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                            !notification.is_read ? 'bg-blue-50' : ''
                          }`}
                          onClick={() => handleNotificationClick(notification.id, notification.cta_url)}
                        >
                          <div className={`border-l-4 px-3 py-2 ${getCategoryColor(notification.category)}`}>
                            <div className="flex justify-between items-start mb-1">
                              <h4 className="font-semibold text-sm text-gray-800">
                                {notification.title}
                              </h4>
                              {!notification.is_read && (
                                <span className="ml-2 h-2 w-2 bg-blue-500 rounded-full flex-shrink-0 mt-1"></span>
                              )}
                            </div>
                            <div 
                              className="text-sm text-gray-600 mb-2"
                              dangerouslySetInnerHTML={{ __html: notification.message }}
                            />
                            {notification.cta_text && (
                              <span className="text-xs text-blue-600 font-medium">
                                {notification.cta_text} →
                              </span>
                            )}
                            <p className="text-xs text-gray-400 mt-1">
                              {formatDateColombia(notification.created_at)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <Link href="/perfil" className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Mi Perfil">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-gray-700"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </Link>
            <button 
              onClick={() => signOut()}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Cerrar Sesión"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-gray-700"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
            </button>
          </>
        ) : (
          <Link href="/login">
            <button 
              className="px-3 py-2 md:px-5 md:py-2.5 rounded-lg transition-colors text-white font-medium text-sm md:text-base"
              style={{ backgroundColor: hoveredButton === 'login' ? '#4a6bb8' : '#557DCE' }}
              onMouseEnter={() => setHoveredButton('login')}
              onMouseLeave={() => setHoveredButton(null)}
            >
              Iniciar Sesión
            </button>
          </Link>
        )}
        {!user && (
          <Link href="/suscripcion">
            <button 
              className="px-3 py-2 md:px-5 md:py-2.5 rounded-lg transition-colors text-white font-medium text-sm md:text-base"
              style={{ backgroundColor: hoveredButton === 'subscribe' ? '#9a4391' : '#AF4CA4' }}
              onMouseEnter={() => setHoveredButton('subscribe')}
              onMouseLeave={() => setHoveredButton(null)}
            >
              Suscribirse
            </button>
          </Link>
        )}
      </div>
    </div>
  );
}