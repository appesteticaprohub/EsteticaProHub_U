'use client';

import { useState } from 'react';

interface ReplyFormProps {
  userName: string;
  onSubmit: (content: string) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
  initialValue?: string;
}

export default function ReplyForm({ userName, onSubmit, onCancel, isSubmitting, initialValue }: ReplyFormProps) {
  const [replyText, setReplyText] = useState(initialValue || `@${userName} `);

  const handleSubmit = async () => {
    if (!replyText.trim()) {
      return;
    }
    await onSubmit(replyText.trim());
    setReplyText('');
  };

  return (
    <div className="mt-3 ml-11 bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex justify-between items-center mb-3">
        <h4 className="text-sm font-medium text-blue-900">
          Agregar respuesta
        </h4>
        <button
          onClick={onCancel}
          className="text-blue-600 hover:text-blue-800 text-sm"
        >
          Cancelar
        </button>
      </div>
      <textarea
        value={replyText}
        onChange={(e) => setReplyText(e.target.value)}
        placeholder="Usa @ para mencionar usuarios..."
        className="w-full p-3 border border-blue-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
        rows={3}
        disabled={isSubmitting}
        autoFocus
      />
      <div className="flex justify-end mt-3">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || !replyText.trim()}
          className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 ${
            isSubmitting || !replyText.trim()
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {isSubmitting ? 'Enviando...' : 'Responder'}
        </button>
      </div>
    </div>
  );
}