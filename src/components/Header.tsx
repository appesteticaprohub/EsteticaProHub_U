import Link from 'next/link';

export default function Header() {
  return (
    <div className="w-full bg-white shadow-sm flex justify-between items-center h-16 py-4 px-6">
      <div>EsteticaPro Hub</div>
      <div className="flex space-x-3">
        <Link href="/login">
          <button className="bg-blue-500 text-white px-4 py-2 rounded-lg">
            Iniciar Sesión
          </button>
        </Link>
        <Link href="/suscripcion">
          <button className="bg-yellow-500 text-white px-4 py-2 rounded-lg">
            Suscribirse
          </button>
        </Link>
      </div>
    </div>
  );
}