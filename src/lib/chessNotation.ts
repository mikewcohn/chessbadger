export const normalizeSan = (san: string) =>
  san.trim().replaceAll('0', 'O').replace(/[+#?!]+$/g, '')
