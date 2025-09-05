'use client';

import { useState } from 'react';

export default function Registro() {
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    email: '',
    contraseña: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Por ahora sin funcionalidad, según la instrucción
    console.log('Datos del formulario:', formData);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-100 py-12 px-4">
      <div className="max-w-md mx-auto">
        {/* Título */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            ¡Completa tu registro!
          </h1>
          <p className="text-gray-600">
            Solo faltan unos datos para activar tu cuenta Premium
          </p>
        </div>

        {/* Formulario */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Campo Nombre */}
            <div>
              <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 mb-2">
                Nombre *
              </label>
              <input
                type="text"
                id="nombre"
                name="nombre"
                value={formData.nombre}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="Tu nombre"
              />
            </div>

            {/* Campo Apellido */}
            <div>
              <label htmlFor="apellido" className="block text-sm font-medium text-gray-700 mb-2">
                Apellido *
              </label>
              <input
                type="text"
                id="apellido"
                name="apellido"
                value={formData.apellido}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="Tu apellido"
              />
            </div>

            {/* Campo Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email *
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="tu@email.com"
              />
            </div>

            {/* Campo Contraseña */}
            <div>
              <label htmlFor="contraseña" className="block text-sm font-medium text-gray-700 mb-2">
                Contraseña *
              </label>
              <input
                type="password"
                id="contraseña"
                name="contraseña"
                value={formData.contraseña}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="Mínimo 8 caracteres"
                minLength={8}
              />
            </div>

            {/* Botón de envío */}
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold py-4 px-8 rounded-lg text-lg transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
            >
              ✨ Finalizar Registro
            </button>
          </form>

          {/* Información adicional */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Al registrarte, aceptas nuestros términos y condiciones
            </p>
          </div>
        </div>

        {/* Indicador de éxito */}
        <div className="text-center mt-6">
          <p className="text-green-600 font-medium">
            🎉 ¡Ya casi terminas! Tu suscripción Premium está lista.
          </p>
        </div>
      </div>
    </main>
  );
}