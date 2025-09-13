'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'


export default function MiPerfil() {
  const { user, signOut, loading } = useAuth()
  const router = useRouter()

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Cargando...</div>
      </main>
    )
  }

  if (!user) {
    return null
  }

  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">
              Mi Perfil
            </h1>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <div className="text-lg text-gray-900 bg-gray-50 px-4 py-3 rounded-md">
                  {user.email}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ID de Usuario
                </label>
                <div className="text-lg text-gray-900 bg-gray-50 px-4 py-3 rounded-md font-mono text-sm">
                  {user.id}
                </div>
              </div>
            </div>
            
            <div className="mt-8 pt-6 border-t border-gray-200">
              <button
                onClick={handleSignOut}
                className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-6 rounded-md transition duration-200"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}