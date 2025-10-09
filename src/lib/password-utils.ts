// Validar formato de email
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Validar fortaleza de contraseña
export function isValidPassword(password: string): {
  valid: boolean
  error?: string
} {
  if (!password) {
    return { valid: false, error: 'La contraseña es requerida' }
  }

  if (password.length < 8) {
    return { valid: false, error: 'La contraseña debe tener al menos 8 caracteres' }
  }

  return { valid: true }
}

// Verificar que las contraseñas coincidan
export function passwordsMatch(password: string, confirmPassword: string): boolean {
  return password === confirmPassword
}

// Constantes de validación
export const PASSWORD_MIN_LENGTH = 8
export const PASSWORD_RULES = {
  minLength: PASSWORD_MIN_LENGTH,
  message: `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres`
}