'use client'

import { useState, useEffect } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import Link from 'next/link';

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

export default function NotificationsPage() {
  const [selectedType, setSelectedType] = useState<'all' | 'email' | 'in_app'>('all');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'critical' | 'important' | 'normal' | 'promotional'>('all');
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [limit, setLimit] = useState(20);

  const { notifications, total, unreadCount, isLoading, markAsRead, refresh } = useNotifications({ 
    limit,
    onlyUnread,
    type: selectedType === 'all' ? undefined : selectedType,
    category: selectedCategory === 'all' ? undefined : selectedCategory
  });

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'critical': return 'bg-red-100 border-red-500';
      case 'important': return 'bg-yellow-100 border-yellow-500';
      case 'promotional': return 'bg-purple-100 border-purple-500';
      default: return 'bg-blue-100 border-blue-500';
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'critical': return 'bg-red-500 text-white';
      case 'important': return 'bg-yellow-500 text-white';
      case 'promotional': return 'bg-purple-500 text-white';
      default: return 'bg-blue-500 text-white';
    }
  };

  const handleNotificationClick = async (notificationId: string, ctaUrl: string | null, isRead: boolean) => {
    if (!isRead) {
      await markAsRead(notificationId);
    }
    if (ctaUrl) {
      window.location.href = ctaUrl;
    }
  };

  // Ya no necesitamos filtrar en el cliente porque el hook lo hace
  const filteredNotifications = notifications;

  return (
    <main className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Centro de Notificaciones</h1>
            <p className="text-gray-600">
              Gestiona todas tus notificaciones en un solo lugar
            </p>
          </div>
          {unreadCount > 0 && (
            <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-lg">
              <span className="font-semibold">{unreadCount}</span> no leídas
            </div>
          )}
        </div>

        {/* Filtros */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Filtro por tipo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo
              </label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Todas</option>
                <option value="in_app">En la app</option>
                <option value="email">Por email</option>
              </select>
            </div>

            {/* Filtro por categoría */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Categoría
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Todas</option>
                <option value="critical">Críticas</option>
                <option value="important">Importantes</option>
                <option value="normal">Normales</option>
                <option value="promotional">Promocionales</option>
              </select>
            </div>

            {/* Filtro solo no leídas */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estado
              </label>
              <div className="flex items-center h-10">
                <input
                  type="checkbox"
                  id="onlyUnread"
                  checked={onlyUnread}
                  onChange={(e) => setOnlyUnread(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="onlyUnread" className="ml-2 text-sm text-gray-700">
                  Solo no leídas
                </label>
              </div>
            </div>

            {/* Límite de notificaciones */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mostrar
              </label>
              <select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={10}>10 notificaciones</option>
                <option value={20}>20 notificaciones</option>
                <option value={50}>50 notificaciones</option>
                <option value={100}>100 notificaciones</option>
              </select>
            </div>
          </div>

          {/* Acciones rápidas */}
          <div className="flex gap-3 mt-4 pt-4 border-t border-gray-200">
            <button
              onClick={refresh}
              className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
            >
              🔄 Actualizar
            </button>
          </div>
        </div>
      </div>

      {/* Lista de notificaciones */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="text-gray-500 mt-4">Cargando notificaciones...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="p-12 text-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-16 w-16 mx-auto mb-4 text-gray-300"
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
            <p className="text-gray-500 text-lg">No hay notificaciones</p>
            <p className="text-gray-400 text-sm mt-2">
              {onlyUnread ? 'No tienes notificaciones no leídas' : 'Aún no has recibido notificaciones'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-5 hover:bg-gray-50 transition-colors cursor-pointer ${
                  !notification.is_read ? 'bg-blue-50' : ''
                }`}
                onClick={() => handleNotificationClick(notification.id, notification.cta_url, notification.is_read)}
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Contenido principal */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-xs font-medium px-2 py-1 rounded ${getCategoryBadge(notification.category)}`}>
                        {notification.category === 'critical' && 'Crítica'}
                        {notification.category === 'important' && 'Importante'}
                        {notification.category === 'normal' && 'Normal'}
                        {notification.category === 'promotional' && 'Promocional'}
                      </span>
                      <span className="text-xs text-gray-400">
                        {formatDateColombia(notification.created_at)}
                      </span>
                      {!notification.is_read && (
                        <span className="h-2 w-2 bg-blue-500 rounded-full"></span>
                      )}
                    </div>

                    <div className={`border-l-4 px-4 py-2 ${getCategoryColor(notification.category)}`}>
                      <h3 className="font-semibold text-gray-800 mb-1">
                        {notification.title}
                      </h3>
                      <div 
                        className="text-sm text-gray-600"
                        dangerouslySetInnerHTML={{ __html: notification.message }}
                      />
                      {notification.cta_text && (
                        <div className="mt-3">
                          <span className="text-sm text-blue-600 font-medium">
                            {notification.cta_text} →
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Badge de tipo */}
                  <div className="flex-shrink-0">
                    {notification.type === 'email' ? (
                      <div className="text-gray-400" title="Enviada por email">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                    ) : (
                      <div className="text-gray-400" title="Notificación en la app">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer con info */}
        {filteredNotifications.length > 0 && (
          <div className="p-4 bg-gray-50 border-t border-gray-200 text-center text-sm text-gray-600">
            Mostrando {filteredNotifications.length} de {total} notificaciones
          </div>
        )}
      </div>
    </main>
  );
}