declare module 'dompurify' {
  function sanitize(dirty: string): string
  const DOMPurify: { sanitize: typeof sanitize }
  export default DOMPurify
}
