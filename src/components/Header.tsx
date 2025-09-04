export default function Header() {
  return (
    <div className="w-full bg-white shadow-sm flex justify-between items-center h-16 py-4 px-6">
      <div>EsteticaPro Hub</div>
      <div className="flex space-x-3">
        <button className="bg-blue-500 text-white px-4 py-2 rounded-lg">
          Iniciar Sesión
        </button>
        <button className="bg-yellow-500 text-white px-4 py-2 rounded-lg">
          Suscribirse
        </button>
      </div>
    </div>
  );
}