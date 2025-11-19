'use client'

import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { useNotificationsContext } from '@/contexts/NotificationsContext';
import Avatar from './Avatar';
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
  const { user, loading, signOut, fullName, avatarUrl } = useAuth();
  const { notifications, unreadCount, markAsRead, markAsReadAndNavigate, refresh, loading: notificationsLoading } = useNotificationsContext();

  console.log('🏠 [HEADER] Usando contexto - Notifications:', notifications.length, 'Unread:', unreadCount);
  
  // Limitar a 5 notificaciones para el dropdown
  const dropdownNotifications = notifications.slice(0, 5);
  
  const [showNotifications, setShowNotifications] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const getInitials = (name: string | null, email: string) => {
    if (name && name.trim()) {
      const nameParts = name.trim().split(' ')
      if (nameParts.length >= 2) {
        return (nameParts[0][0] + nameParts[1][0]).toUpperCase()
      }
      return name.substring(0, 2).toUpperCase()
    }
    return email.substring(0, 2).toUpperCase()
  }

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

  // Bloquear scroll del body cuando el dropdown está abierto
  useEffect(() => {
    if (showNotifications) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showNotifications]);

  const handleRefresh = async (e: React.MouseEvent) => {
  e.stopPropagation();
  setIsRefreshing(true);
  await refresh();
  // Esperar un mínimo de 500ms para que se vea la animación
  setTimeout(() => {
    setIsRefreshing(false);
  }, 500);
};

  const handleNotificationRead = async (notificationId: string) => {
  await markAsRead(notificationId);
};

const handleNotificationNavigate = async (notificationId: string, ctaUrl: string | null) => {
  setShowNotifications(false);
  await markAsReadAndNavigate(notificationId, ctaUrl);
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
    <div className="w-full header-gradient flex justify-between items-center h-16 py-4 px-4 md:px-6">
      <Link href="/" className="flex items-center">
      {/* Vista móvil: Solo logo con sombra */}
      <div className="md:hidden">
        <Image 
          src="/logo.svg" 
          alt="EsteticaPro Hub" 
          width={32}
          height={32}
          className="logo-shadow"
          priority
        />
      </div>
      
      {/* Vista desktop: Logo + texto con sombra */}
      <div className="hidden md:flex items-center gap-3">
        <Image 
          src="/logo.svg" 
          alt="EsteticaPro Hub Logo" 
          width={40}
          height={40}
          className="logo-shadow"
          priority
        />
        <span className="logo-text text-lg">
          EsteticaPro Hub
        </span>
      </div>
    </Link>

      <div className="flex gap-3 md:gap-4 items-center">
        {loading ? (
          <div className="header-button px-4 py-2 rounded-lg text-white">
            Cargando...
          </div>
        ) : user ? (
          <>
            {/* Campana de notificaciones */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="notification-bell relative p-2 rounded-lg"
                aria-label="Notificaciones"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-white"
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
                  <span className="notification-badge absolute -top-1 -right-1 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Dropdown de notificaciones */}
              {showNotifications && (
                <div className="notification-dropdown fixed md:absolute right-2 md:right-0 top-[5rem] md:top-auto md:mt-3 w-[calc(100vw-1rem)] md:w-96 bg-white rounded-lg z-50 max-h-[500px] overflow-y-auto">
                  {/* Header con botón refrescar */}
                  <div className="p-4 border-b border-gray-200">
                    <div className="flex justify-between items-center mb-1">
                      <h3 className="font-semibold text-gray-800">Notificaciones</h3>
                      <button
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className="refresh-button p-1.5 hover:bg-gray-100 rounded-lg transition-colors disabled:hover:bg-transparent"
                        title="Refrescar notificaciones"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className={`h-5 w-5 text-gray-600 ${isRefreshing ? 'refresh-icon-spinning' : ''}`}
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
                    <p className="text-xs text-gray-500">Toca 🔄 para actualizar</p>
                  </div>

                  {/* Link Ver todas */}
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
                    {dropdownNotifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                          !notification.is_read ? 'bg-blue-50' : ''
                        }`}
                        onClick={() => handleNotificationRead(notification.id)}
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
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleNotificationNavigate(notification.id, notification.cta_url || null);
                              }}
                              className="text-xs text-blue-600 font-medium hover:text-blue-800 transition-colors"
                            >
                              {notification.cta_text} →
                            </button>
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

            {/* Avatar con marco blanco y diamante */}
            <Link 
              href="/perfil" 
              className="avatar-white-border" 
              title="Mi Perfil"
            >
              <Avatar
                src={avatarUrl}
                alt={fullName || user.email || 'Usuario'}
                size="md"
                fallbackText={getInitials(fullName, user.email || '')}
              />
              
              {/* Ícono de diamante */}
              <div className="diamond-badge">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                  <path d="M12 2L3 8L5 14L12 22L19 14L21 8L12 2Z" fill="white" opacity="0.9"/>
                  <path d="M12 2L9 8H15L12 2Z" fill="white"/>
                  <path d="M3 8L5 14L9 8H3Z" fill="white" opacity="0.7"/>
                  <path d="M15 8L19 14L21 8H15Z" fill="white" opacity="0.7"/>
                  <path d="M5 14L12 22L19 14L12 11L5 14Z" fill="white" opacity="0.5"/>
                </svg>
              </div>
            </Link>

            {/* Botón cerrar sesión */}
            <button 
              onClick={() => signOut()}
              className="logout-button p-2 rounded-lg"
              title="Cerrar Sesión"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-white"
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
          <>
            <Link 
              href="/login"
              className="auth-button-outline px-2 py-1.5 md:px-4 md:py-2 text-xs md:text-base rounded-lg"
            >
              Iniciar Sesión
            </Link>
            <Link href="/suscripcion">
              <button className="auth-button-solid px-2 py-2 md:px-5 md:py-2.5 rounded-lg text-xs md:text-base">
                Suscribirse
              </button>
            </Link>
          </>
        )}
      </div>
    </div>
  );
}