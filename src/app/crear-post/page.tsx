'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import Modal from '@/components/Modal';
import PaymentRecoveryModal from '@/components/PaymentRecoveryModal';
import { createPost } from '@/lib/supabase';
import ImageUploader from '@/components/ImageUploader';
import { ImageSettings } from '@/types/api';
import RichTextEditor from '@/components/RichTextEditor';
import { sanitizeHTML } from '@/lib/html-sanitizer';
import { getCachedSettings, setCachedSettings } from '@/lib/image-utils';
import imageCompression from 'browser-image-compression';

// Tipo para la respuesta del post creado
interface CreatedPost {
  id: string;
  title: string;
  content: string;
  category: string;
  author_id: string;
  created_at: string;
  updated_at: string;
  views_count: number;
  likes_count: number;
  comments_count: number;
}

export default function CrearPost() {
  const { user, session, userType, loading: authLoading } = useAuth();
  const { subscriptionStatus, subscriptionData, loading: statusLoading } = useSubscriptionStatus();
  const loading = authLoading || statusLoading;
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [modalButtons, setModalButtons] = useState<'subscription' | 'login' | 'renew' | 'cancelled'>('subscription');
  const [showPaymentRecoveryModal, setShowPaymentRecoveryModal] = useState(false);
  // 🆕 FUNCIÓN PARA DETECTAR CAMBIO DE PRECIO (MOVIDA AQUÍ)
  const checkPriceChangeAndSetMessage = async () => {
    try {
      // Obtener precio actual
      const priceResponse = await fetch('/api/subscription-price');
      const priceData = await priceResponse.json();
      const currentPrice = priceData.price;
      
      // Obtener último pago del usuario
      const statusResponse = await fetch('/api/subscription-status');
      const statusData = await statusResponse.json();
      const lastPayment = statusData.data.last_payment_amount || 0;
      
      // Determinar mensaje según cambio de precio
      if (lastPayment === null || lastPayment === 0) {
        // Usuario sin historial de pagos
        setModalMessage('Necesitas renovar tu suscripción');
      } else if (currentPrice !== lastPayment) {
        // Usuario con historial diferente al precio actual
        setModalMessage(`El precio ha cambiado de $${lastPayment} a $${currentPrice}. Renueva con el nuevo precio.`);
      } else {
        // Mismo precio
        setModalMessage('Necesitas renovar tu suscripción');
      }
      
      setModalButtons('renew');
      setShowModal(true);
      
    } catch (error) {
      console.error('Error detectando cambio de precio:', error);
      // Fallback al mensaje original
      setModalMessage('Necesitas renovar tu suscripción');
      setModalButtons('renew');
      setShowModal(true);
    }
  };
  const [categoria, setCategoria] = useState('');
  const [titulo, setTitulo] = useState('');
  const [contenido, setContenido] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [imageSettings, setImageSettings] = useState<ImageSettings | null>(null);
  const [showEmptyContentModal, setShowEmptyContentModal] = useState(false);

  // Estado para evitar múltiples cargas
const [settingsLoaded, setSettingsLoaded] = useState(false);

// Cargar configuración de imágenes con cache inteligente
useEffect(() => {
  if (settingsLoaded) return; // ✅ Evitar múltiples ejecuciones
  
  const loadImageSettings = async () => {
    try {
      // ✅ Primero intentar obtener desde cache
      const cachedSettings = await getCachedSettings<ImageSettings>();
      console.log('🔍 Cache check result:', cachedSettings ? 'FOUND' : 'NOT_FOUND');
      if (cachedSettings) {
        console.log('✅ Usando configuración desde cache:', cachedSettings);
        setImageSettings(cachedSettings);
        setSettingsLoaded(true); // ✅ Marcar como cargado
        return;
      }

      // ✅ Si no hay cache, hacer fetch al servidor
      console.log('🔄 Descargando configuración desde servidor');
      const response = await fetch('/api/settings');
      const result = await response.json();
      
      if (result.data) {
        // Construir objeto ImageSettings desde las configuraciones individuales
        const settings: ImageSettings = {
          max_images_per_post: result.data.max_images_per_post || 3,
          max_image_size_mb: result.data.max_image_size_mb || 2,
          allowed_formats: result.data.allowed_formats || ['image/jpeg', 'image/png', 'image/webp'],
          compression_quality: result.data.compression_quality || 0.8,
          max_width: result.data.max_width || 1920,
          max_height: result.data.max_height || 1920
        };
        
        // ✅ Guardar en cache por 24 horas
        setCachedSettings(settings);
        console.log('✅ Configuración guardada en cache por 24 horas');
        
        setImageSettings(settings);
        setSettingsLoaded(true); // ✅ Marcar como cargado
      }
    } catch (error) {
      console.error('Error al cargar configuración de imágenes:', error);
      
      // ✅ Fallback: intentar usar cache aunque esté expirado
      const expiredCache = await getCachedSettings<ImageSettings>();
      if (expiredCache) {
        console.log('⚠️ Usando configuración expirada como fallback');
        setImageSettings(expiredCache);
        setSettingsLoaded(true); // ✅ Marcar como cargado
      }
    }
  };
  
  loadImageSettings();
}, [settingsLoaded]);

  // Categorías de ejemplo para estética profesional
  const categorias = [
    { value: '', label: 'Todas las categorías' },
    { value: 'casos-clinicos', label: 'Casos Clínicos' },
    { value: 'complicaciones', label: 'Complicaciones' },
    { value: 'tendencias-facial', label: 'Tendencias Facial' },
    { value: 'tendencias-corporal', label: 'Tendencias Corporal' },
    { value: 'tendencias-capilar', label: 'Tendencias Capilar' },
    { value: 'tendencias-spa', label: 'Tendencias Spa' },
    { value: 'gestion-empresarial', label: 'Gestión Empresarial' }
  ];

  useEffect(() => {
    if (!loading && !statusLoading) {
      // Situación 1: Usuario anónimo o sin sesión
      if (!session || userType === 'anonymous') {
        setModalMessage('Necesitas una suscripción');
        setModalButtons('subscription');
        setShowModal(true);
        return;
      }

      // Situación 2: Usuario premium con estado Active y logueado - puede crear post
      if (session && userType === 'premium' && subscriptionStatus === 'Active') {
        setShowModal(false);
        return;
      }

      // Situación 3: Usuario premium con estado Expired - detectar cambio de precio
      if (session && userType === 'premium' && subscriptionStatus === 'Expired') {
        // Verificar si hubo cambio de precio
        checkPriceChangeAndSetMessage();
        return;
      }

      // Situación 4: Usuario premium con estado Cancelled - verificar si aún tiene acceso
      if (session && userType === 'premium' && subscriptionStatus === 'Cancelled') {
        // ✅ Esperar a que subscriptionData esté completamente cargado
        if (!subscriptionData?.subscription_expires_at) {
          console.log('⏳ Esperando datos completos de suscripción...');
          return; // No hacer nada hasta que los datos estén listos
        }
        
        const now = new Date();
        const expirationDate = new Date(subscriptionData.subscription_expires_at);
        
        console.log('🔍 Usuario Cancelled - verificando acceso:', {
          ahora: now.toISOString(),
          expira: expirationDate.toISOString(),
          tieneAcceso: now <= expirationDate
        });
        
        if (now <= expirationDate) {
          // Aún tiene acceso hasta la fecha de expiración
          console.log('✅ Usuario Cancelled con acceso válido hasta:', expirationDate);
          setShowModal(false);
          return;
        } else {
          // Ya expiró el acceso
          console.log('❌ Usuario Cancelled sin acceso válido');
          setModalMessage('Tu suscripción cancelada ha expirado. Necesitas renovar para continuar.');
          setModalButtons('renew');
          setShowModal(true);
          return;
        }
      }

      // Situación 5: Usuario con problemas de pago
      if (session && userType === 'premium' && 
          (subscriptionStatus === 'Payment_Failed' || 
           subscriptionStatus === 'Grace_Period' || 
           subscriptionStatus === 'Suspended')) {
        setShowPaymentRecoveryModal(true);
        return;
      }
    }
  }, [session, userType, subscriptionStatus, loading, statusLoading, subscriptionData?.subscription_expires_at]);

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  // Validar que el contenido no esté vacío
  if (!contenido.trim() || contenido === '<br>' || contenido === '<p><br></p>') {
    setShowEmptyContentModal(true);
    return;
  }
  
  if (!user) {
    console.error('Usuario no autenticado');
    return;
  }

  setIsUploading(true);

  try {
    let uploadedUrls: string[] = [];
    
    // 1. Si hay imágenes seleccionadas, subirlas AHORA
    if (selectedFiles.length > 0) {
      uploadedUrls = await uploadImages(selectedFiles);
      
      if (!uploadedUrls || uploadedUrls.length === 0) {
        throw new Error('Error al subir imágenes');
      }
    }

    // 2. Sanitizar el contenido antes de enviarlo
    const sanitizedContent = sanitizeHTML(contenido);
    
    // 3. Crear post con las URLs (o array vacío si no hay imágenes)
    const { data, error } = await createPost({
      title: titulo,
      content: sanitizedContent,
      category: categoria,
      authorId: user.id,
      images: uploadedUrls
    }) as { data: CreatedPost | null; error: string | null };

    if (error) {
      throw new Error(error);
    }

    if (data) {
      // Redirigir al post creado
      router.push(`/post/${data.id}`);
    }
    
  } catch (error) {
    console.error('Error al crear post:', error);
    alert('Error al crear el post. Por favor intenta de nuevo.');
  } finally {
    setIsUploading(false);
  }
};

  const handleCloseModal = () => {
    setShowModal(false);
    // Redirigir al inicio después de cerrar el modal
    router.push('/');
  };

  const uploadImages = async (files: File[]): Promise<string[]> => {
  if (!imageSettings) {
    throw new Error('Configuración de imágenes no disponible');
  }

  const formData = new FormData();
  
  // Comprimir cada imagen antes de subir
  for (const file of files) {
    try {
      const compressedFile = await imageCompression(file, {
        maxSizeMB: imageSettings.max_image_size_mb,
        maxWidthOrHeight: Math.max(imageSettings.max_width, imageSettings.max_height),
        useWebWorker: true,
        fileType: file.type,
        initialQuality: imageSettings.compression_quality
      });
      formData.append('images', compressedFile);
    } catch (error) {
      console.error('Error al comprimir imagen:', error);
      // Si falla la compresión, usar archivo original
      formData.append('images', file);
    }
  }
  
  // Subir a la API
  const response = await fetch('/api/posts/upload-images', {
    method: 'POST',
    body: formData
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Error al subir imágenes');
  }
  
  const result = await response.json();
  return result.urls || [];
};


  const handleGoToSubscription = () => {
    setShowModal(false);
    router.push('/suscripcion');
  };

  // Mostrar contenido directamente, el modal se maneja por estado
  return (
    <main className="p-6 max-w-4xl mx-auto">
      {/* Modal de contenido vacío */}
      <Modal isOpen={showEmptyContentModal} onClose={() => setShowEmptyContentModal(false)} showLockIcon={false}>
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Contenido Requerido
          </h3>
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 mb-4">
            <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <p className="text-gray-600 mb-6">
            Por favor ingresa contenido para tu post antes de continuar. El contenido es obligatorio para crear una publicación.
          </p>
          <button
            onClick={() => setShowEmptyContentModal(false)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md transition-colors"
          >
            Entendido
          </button>
        </div>
      </Modal>
      {/* Modal de Recovery de Pagos */}
      <PaymentRecoveryModal 
        isOpen={showPaymentRecoveryModal}
        onClose={() => setShowPaymentRecoveryModal(false)}
        subscriptionStatus={subscriptionStatus || ''}
        paymentRetryCount={subscriptionData.payment_retry_count}
        gracePeriodEnds={subscriptionData.grace_period_ends}
        paypalSubscriptionId={subscriptionData.paypal_subscription_id}
      />
      {/* Modal de protección */}
      <Modal isOpen={showModal} onClose={handleCloseModal}>
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Acceso Restringido
          </h3>
          <p className="text-gray-600 mb-6">
            {modalMessage}
          </p>
          
          {/* Botones según el tipo de situación */}
          {modalButtons === 'subscription' && (
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={handleGoToSubscription}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-md transition-colors"
              >
                Ver Suscripciones
              </button>
            </div>
          )}

          {modalButtons === 'renew' && (
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={handleGoToSubscription}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-md transition-colors"
              >
                Renovar Suscripción
              </button>
            </div>
          )}

          {modalButtons === 'cancelled' && (
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={handleGoToSubscription}
                className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-md transition-colors"
              >
                Contactar Soporte
              </button>
            </div>
          )}

          <button
            onClick={handleCloseModal}
            className="mt-4 text-gray-500 hover:text-gray-700 text-sm"
          >
            Volver al inicio
          </button>
        </div>
      </Modal>

      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Link 
            href="/"
            className="text-blue-600 hover:text-blue-800 transition-colors"
          >
            ← Volver al inicio
          </Link>
        </div>
        <h1 className="text-3xl font-bold text-gray-800">Crear Nuevo Post</h1>
        <p className="text-gray-600 mt-2">
          Comparte tu conocimiento y experiencia con la comunidad de estética profesional
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Categoría */}
          <div>
            <label htmlFor="categoria" className="block text-sm font-medium text-gray-700 mb-2">
              Categoría *
            </label>
            <select
              id="categoria"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {categorias.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Título */}
          <div>
            <label htmlFor="titulo" className="block text-sm font-medium text-gray-700 mb-2">
              Título *
            </label>
            <input
              type="text"
              id="titulo"
              value={titulo}
              onChange={(e) => {
                const value = e.target.value;
                // Capitalizar primera letra si hay texto
                const capitalizedValue = value.charAt(0).toUpperCase() + value.slice(1);
                setTitulo(capitalizedValue);
              }}
              required
              placeholder="Ingresa el título de tu post"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Contenido */}
          <div>
            <label htmlFor="contenido" className="block text-sm font-medium text-gray-700 mb-2">
              Contenido *
            </label>
            <RichTextEditor
              value={contenido}
              onChange={(value) => setContenido(value)}
              placeholder="Escribe el contenido de tu post..."
              disabled={isUploading}
            />
            {contenido.length === 0 && (
              <p className="text-xs text-red-500 mt-1">Este campo es obligatorio</p>
            )}
          </div>

          {/* Imágenes */}
          {imageSettings && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Imágenes (opcional)
            </label>
            <ImageUploader
              settings={imageSettings}
              onFilesSelected={(files) => setSelectedFiles(files)}
              disabled={!user}
            />
          </div>
        )}

          {/* Botones */}
          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={isUploading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isUploading ? 'Creando post...' : 'Crear Post'}
            </button>
            <Link
              href="/"
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-2 rounded-md transition-colors"
            >
              Cancelar
            </Link>
          </div>
        </form>
      </div>

      {/* Modal de progreso */}
      {isUploading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">Creando tu post...</h3>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
              <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{width: '100%'}}></div>
            </div>
            <p className="text-sm text-gray-600">
              {selectedFiles.length > 0 
                ? `Subiendo ${selectedFiles.length} ${selectedFiles.length === 1 ? 'imagen' : 'imágenes'}...` 
                : 'Guardando...'
              }
            </p>
          </div>
        </div>
      )}
    </main>
  );
}