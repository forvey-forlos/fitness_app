export const USERNAME_MAX_LENGTH = 30

// 与 server/src/validators/auth.js 保持一致：数字、ASCII 英文字母、Unicode 汉字。
const USERNAME_CHARACTER = /[A-Za-z0-9\p{Script=Han}]/u
const USERNAME_PATTERN = /^[A-Za-z0-9\p{Script=Han}]+$/u

export function sanitizeUsername(value) {
  return Array.from(String(value || ''))
    .filter((character) => USERNAME_CHARACTER.test(character))
    .slice(0, USERNAME_MAX_LENGTH)
    .join('')
}

export function getUsernameError(value) {
  if (!value) return '请输入用户名'
  if (!USERNAME_PATTERN.test(value)) return '用户名仅支持数字、英文和汉字'
  if (Array.from(value).length > USERNAME_MAX_LENGTH) return '用户名不能超过 30 个字符'
  return ''
}
