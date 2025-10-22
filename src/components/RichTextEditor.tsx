'use client';

import { useEffect, useRef, useState } from 'react';
import { sanitizeHTML } from '@/lib/html-sanitizer';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function RichTextEditor({ 
  value, 
  onChange, 
  placeholder = 'Escribe el contenido de tu post...',
  disabled = false 
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const lastValueRef = useRef(value);

  // Solo inicializar al montar, NUNCA sobrescribir durante la edición
  useEffect(() => {
  if (!editorRef.current) return;
  
  // Solo inicializar si el editor está vacío y hay un valor inicial
  if (editorRef.current.innerHTML === '' && value) {
    editorRef.current.innerHTML = value;
    lastValueRef.current = value;
  }
  
  // Configurar el editor para usar <p> por defecto
  if (typeof document !== 'undefined') {
    try {
      document.execCommand('defaultParagraphSeparator', false, 'p');
    } catch {
      console.warn('No se pudo configurar el separador de párrafos');
    }
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

  // Sincronizar solo cuando el value cambie EXTERNAMENTE (reset de formulario, etc)
  useEffect(() => {
    if (!editorRef.current || isFocused) return;
    
    // Solo actualizar si viene un cambio externo (ej: reset del form)
    // Y es diferente de lo que tenemos internamente
    if (value === '' && editorRef.current.innerHTML !== '') {
      // Reset del formulario
      editorRef.current.innerHTML = '';
      lastValueRef.current = '';
    }
  }, [value, isFocused]);

  // Manejar cambios en el editor
  const handleInput = () => {
    if (!editorRef.current) return;
    
    const html = editorRef.current.innerHTML;
    lastValueRef.current = html;
    onChange(html);
  };

  // Aplicar formato usando execCommand
  const applyFormat = (command: string, value?: string) => {
    if (typeof window === 'undefined' || !editorRef.current) return;
    
    // NO usar setTimeout - aplicar inmediatamente
    editorRef.current.focus();
    
    try {
      const selection = window.getSelection();
      
      // Para comandos de lista, no necesitamos selección de texto
      const isListCommand = command === 'insertOrderedList' || command === 'insertUnorderedList';
      
      // Si no es comando de lista y no hay selección, no hacer nada
      if (!isListCommand && (!selection || selection.rangeCount === 0 || selection.toString().length === 0)) {
        return;
      }
      
      // Aplicar el comando
      document.execCommand(command, false, value);
      
      // Actualizar el estado inmediatamente
      handleInput();
    } catch (error) {
      console.error('Error al aplicar formato:', error);
    }
  };

  // Verificar si un formato está activo
  const isFormatActive = (command: string): boolean => {
    if (typeof window === 'undefined') return false;
    try {
      return document.queryCommandState(command);
    } catch {
      return false;
    }
  };

  // Manejar pegado (limpiar formato)
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
    handleInput();
  };

  // Capitalizar primera letra al escribir
  const handleKeyUp = (e: React.KeyboardEvent) => {
  if (!editorRef.current) return;
  
  const text = editorRef.current.innerText;
  
  // Capitalizar primera letra
  if (text.length === 1) {
    const firstChar = text.charAt(0).toUpperCase();
    if (firstChar !== text.charAt(0)) {
      editorRef.current.innerText = firstChar;
      // Mover cursor al final
      const range = document.createRange();
      const sel = window.getSelection();
      range.selectNodeContents(editorRef.current);
      range.collapse(false);
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }
  
  // Asegurar que Enter crea párrafos <p> en lugar de <div> o <br>
  if (e.key === 'Enter' && !e.shiftKey) {
    // formatBlock crea <p> automáticamente
    document.execCommand('formatBlock', false, 'p');
  }
};

  return (
    <div className="border border-gray-300 rounded-md overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
      {/* Barra de herramientas */}
      <div className="bg-gray-50 border-b border-gray-200 px-3 py-2 flex items-center gap-1 flex-wrap">
        {/* Botón Negrita */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            applyFormat('bold');
          }}
          disabled={disabled}
          className={`p-2 rounded hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-[44px] min-h-[44px] sm:min-w-[36px] sm:min-h-[36px] flex items-center justify-center ${
            isFormatActive('bold') ? 'bg-gray-300' : ''
          }`}
          title="Negrita (Ctrl+B)"
        >
          <span className="font-bold text-gray-700">B</span>
        </button>

        {/* Botón Cursiva */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            applyFormat('italic');
          }}
          disabled={disabled}
          className={`p-2 rounded hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-[44px] min-h-[44px] sm:min-w-[36px] sm:min-h-[36px] flex items-center justify-center ${
            isFormatActive('italic') ? 'bg-gray-300' : ''
          }`}
          title="Cursiva (Ctrl+I)"
        >
          <span className="italic text-gray-700">I</span>
        </button>

        {/* Separador */}
        <div className="w-px h-6 bg-gray-300 mx-1"></div>

        {/* Botón Lista con viñetas */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            applyFormat('insertUnorderedList');
          }}
          disabled={disabled}
          className={`p-2 rounded hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-[44px] min-h-[44px] sm:min-w-[36px] sm:min-h-[36px] flex items-center justify-center ${
            isFormatActive('insertUnorderedList') ? 'bg-gray-300' : ''
          }`}
          title="Lista con viñetas"
        >
          <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Botón Lista numerada */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            applyFormat('insertOrderedList');
          }}
          disabled={disabled}
          className={`p-2 rounded hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-[44px] min-h-[44px] sm:min-w-[36px] sm:min-h-[36px] flex items-center justify-center ${
            isFormatActive('insertOrderedList') ? 'bg-gray-300' : ''
          }`}
          title="Lista numerada"
        >
          <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h2v2H3V4zm4 0h14v2H7V4zM3 10h2v2H3v-2zm4 0h14v2H7v-2zm-4 6h2v2H3v-2zm4 0h14v2H7v-2z" />
          </svg>
        </button>
      </div>

      {/* Área de edición */}
      <div
        ref={editorRef}
        contentEditable={!disabled}
        data-gramm="false"
        data-gramm_editor="false"
        data-enable-grammarly="false"
        onInput={handleInput}
        onPaste={handlePaste}
        onKeyUp={handleKeyUp}
        onKeyDown={(e) => {
          // Forzar que Enter cree <p> en lugar de <div>
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            document.execCommand('insertParagraph', false);
          }
        }}
        onFocus={() => setIsFocused(true)}
         onBlur={() => {
          setIsFocused(false);
          if (editorRef.current) {
            const html = editorRef.current.innerHTML;
            const sanitized = sanitizeHTML(html);
            // Solo llamar onChange si el contenido cambió
            if (sanitized !== lastValueRef.current) {
              lastValueRef.current = sanitized;
              onChange(sanitized);
            }
          }
        }}
        className="rich-text-editor min-h-[200px] p-3 focus:outline-none text-gray-900"
        style={{
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word'
        }}
        data-placeholder={placeholder}
        suppressContentEditableWarning
      />

      {/* Estilos globales para el editor */}
      <style jsx global>{`
        .rich-text-editor[contenteditable][data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: #9CA3AF;
          pointer-events: none;
          position: absolute;
        }
        
        .rich-text-editor {
          -webkit-user-select: text;
          user-select: text;
        }
        
        .rich-text-editor ul {
          list-style-type: disc !important;
          list-style-position: outside !important;
          padding-left: 2.5rem !important;
          margin: 1rem 0 !important;
        }
        
        .rich-text-editor ol {
          list-style-type: decimal !important;
          list-style-position: outside !important;
          padding-left: 2.5rem !important;
          margin: 1rem 0 !important;
        }
        
        .rich-text-editor li {
          display: list-item !important;
          margin: 0.5rem 0 !important;
          padding-left: 0.5rem !important;
        }
        
        .rich-text-editor strong,
        .rich-text-editor b {
          font-weight: 700 !important;
        }
        
        .rich-text-editor em,
        .rich-text-editor i {
          font-style: italic !important;
        }
        
        .rich-text-editor p {
          margin: 0.5rem 0;
        }
      `}</style>
    </div>
  );
}