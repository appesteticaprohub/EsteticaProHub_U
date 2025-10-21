// src/lib/html-sanitizer.ts

/**
 * Sanitiza HTML permitiendo solo etiquetas seguras para formato de texto básico
 * Previene XSS y otras vulnerabilidades
 */

const ALLOWED_TAGS = ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'b', 'i', 'div'];
const ALLOWED_ATTRIBUTES: Record<string, string[]> = {};

export function sanitizeHTML(html: string): string {
  if (!html) return '';
  if (typeof window === 'undefined') return html; // SSR safety

  // Crear un elemento temporal para parsear el HTML
  const temp = document.createElement('div');
  temp.innerHTML = html;

  // Función recursiva para limpiar nodos
  function cleanNode(node: Node): Node | null {
    // Si es un nodo de texto, mantenerlo
    if (node.nodeType === Node.TEXT_NODE) {
      return node.cloneNode(true);
    }

    // Si es un elemento
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element;
      const tagName = element.tagName.toLowerCase();

      // Si la etiqueta no está permitida, extraer sus hijos pero no la etiqueta
      if (!ALLOWED_TAGS.includes(tagName)) {
        const fragment = document.createDocumentFragment();
        Array.from(element.childNodes).forEach(child => {
          const cleanChild = cleanNode(child);
          if (cleanChild) {
            fragment.appendChild(cleanChild);
          }
        });
        return fragment.childNodes.length === 1 ? fragment.firstChild : fragment;
      }

      // Crear nuevo elemento limpio
      const cleanElement = document.createElement(tagName);

      // Copiar solo atributos permitidos
      const allowedAttrs = ALLOWED_ATTRIBUTES[tagName] || [];
      Array.from(element.attributes).forEach(attr => {
        if (allowedAttrs.includes(attr.name)) {
          cleanElement.setAttribute(attr.name, attr.value);
        }
      });

      // Limpiar y copiar hijos
      Array.from(element.childNodes).forEach(child => {
        const cleanChild = cleanNode(child);
        if (cleanChild) {
          cleanElement.appendChild(cleanChild);
        }
      });

      return cleanElement;
    }

    return null;
  }

  // Limpiar todos los nodos hijos
  const cleanDiv = document.createElement('div');
  Array.from(temp.childNodes).forEach(child => {
    const cleanChild = cleanNode(child);
    if (cleanChild) {
      cleanDiv.appendChild(cleanChild);
    }
  });

  const result = cleanDiv.innerHTML;
  return result;
}

/**
 * Convierte HTML a texto plano (para preview o fallback)
 */
export function htmlToPlainText(html: string): string {
  if (!html) return '';
  
  // Si estamos en el servidor (Node.js), hacer limpieza básica con regex
  if (typeof window === 'undefined') {
    return html
      .replace(/<[^>]*>/g, ' ')  // Eliminar todas las etiquetas HTML
      .replace(/&nbsp;/g, ' ')    // Reemplazar &nbsp; con espacio
      .replace(/&amp;/g, '&')     // Decodificar &amp;
      .replace(/&lt;/g, '<')      // Decodificar &lt;
      .replace(/&gt;/g, '>')      // Decodificar &gt;
      .replace(/&quot;/g, '"')    // Decodificar &quot;
      .replace(/&#39;/g, "'")     // Decodificar &#39;
      .replace(/\s+/g, ' ')       // Múltiples espacios a uno solo
      .trim();                    // Eliminar espacios al inicio/final
  }
  
  // En el navegador, usar el método DOM
  const temp = document.createElement('div');
  temp.innerHTML = html;
  return temp.textContent || temp.innerText || '';
}

/**
 * Valida que el HTML solo contenga etiquetas permitidas
 */
export function isValidHTML(html: string): boolean {
  if (!html) return true;
  if (typeof window === 'undefined') return true;
  
  const temp = document.createElement('div');
  temp.innerHTML = html;
  
  function checkNode(node: Node): boolean {
    if (node.nodeType === Node.TEXT_NODE) return true;
    
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element;
      const tagName = element.tagName.toLowerCase();
      
      if (!ALLOWED_TAGS.includes(tagName)) return false;
      
      return Array.from(element.childNodes).every(child => checkNode(child));
    }
    
    return false;
  }
  
  return Array.from(temp.childNodes).every(child => checkNode(child));
}