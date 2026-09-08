/**
 * Utility to detect if WebGL / WebGL2 is supported and active in the current browser/iframe.
 */
export function isWebGLSupported(): boolean {
  if (typeof window === 'undefined' || !window.document) return false;

  try {
    const canvas = document.createElement('canvas');
    const gl =
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl') ||
      canvas.getContext('webgl2');
    return !!(window.WebGLRenderingContext && gl);
  } catch {
    return false;
  }
}
