// components/CategoryCard/LimitSelector.tsx
'use client';

import { useState } from 'react';

interface LimitSelectorProps {
  currentLimit: number;
  onLimitChange: (limit: number) => void;
}

export default function LimitSelector({ currentLimit, onLimitChange }: LimitSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const limits = [5, 10, 15];

  return (
    <div className="relative z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 hover:bg-white/20 rounded-full transition-colors"
        title="Configurar cantidad de posts"
      >
        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>
      
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-[100]" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 bg-white border-2 border-gray-800 rounded-lg shadow-2xl z-[101] min-w-[140px]">
            {limits.map((limit) => (
              <button
                key={limit}
                onClick={() => {
                  onLimitChange(limit);
                  setIsOpen(false);
                }}
                className={`block w-full px-5 py-3 text-left text-base font-bold transition-colors first:rounded-t-lg last:rounded-b-lg ${
                  currentLimit === limit 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white text-gray-900 hover:bg-blue-50'
                }`}
              >
                {limit} posts
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}