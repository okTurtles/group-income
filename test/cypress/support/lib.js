export const randomUserSuffix = () => {
  return Math.random().toString(36).slice(2, 8).padEnd(6, '0')
}
