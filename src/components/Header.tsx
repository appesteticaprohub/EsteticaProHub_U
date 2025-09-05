'use client'

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export default function Header() {
  const { user, loading } = useAuth();

  return (
    <div className="w-full bg-white shadow-sm flex justify-between items-center h-16 py-4 px-6">
      <div>EsteticaPro Hub</div>
      <div className="flex space-x-3">
        {loading ? (
          <div className="bg-gray-300 text-gray-600 px-4 py-2 rounded-lg">
            Cargando...
          </div>
        ) : user ? (
          <Link href="/perfil">
            <button className="bg-blue-500 text-white px-4 py-2 rounded-lg">
              Mi Perfil
            </button>
          </Link>
        ) : (
          <Link href="/login">
            <button className="bg-blue-500 text-white px-4 py-2 rounded-lg">
              Iniciar Sesión
            </button>
          </Link>
        )}
        <Link href="/suscripcion">
          <button className="bg-yellow-500 text-white px-4 py-2 rounded-lg">
            Suscribirse
          </button>
        </Link>
      </div>
    </div>
  );
}