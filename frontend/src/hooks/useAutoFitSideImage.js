import { useCallback, useEffect, useState } from "react";

/**
 * Calcula el ancho exacto (en px) que debe tener el panel lateral de una imagen
 * para que ocupe TODO el alto disponible (igual que antes) y TODO el ancho que
 * le corresponde según su proporción real — sin recortar (object-contain ya no
 * deja franjas vacías porque el contenedor mide justo lo que la imagen necesita)
 * ni estirar (nunca se fuerza una proporción distinta a la real de la foto).
 *
 * Usa un ref-callback (en vez de useRef + useEffect con deps []) porque este
 * panel suele vivir dentro de un modal que se monta oculto (`if (!open) return null`)
 * — con useRef normal, el efecto correría una sola vez con el nodo aún en null.
 */
export function useAutoFitSideImage({ maxWidthRatio = 0.46, minWidth = 180 } = {}) {
  const [wrapEl, setWrapEl] = useState(null);
  const wrapRef = useCallback((node) => setWrapEl(node), []);
  const [height, setHeight] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const [imgRatio, setImgRatio] = useState(null);

  useEffect(() => {
    if (!wrapEl) return;
    setHeight(wrapEl.getBoundingClientRect().height);
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) setHeight(entry.contentRect.height);
    });
    ro.observe(wrapEl);
    let ro2;
    if (wrapEl.parentElement) {
      setContainerWidth(wrapEl.parentElement.getBoundingClientRect().width);
      ro2 = new ResizeObserver((entries) => {
        for (const entry of entries) setContainerWidth(entry.contentRect.width);
      });
      ro2.observe(wrapEl.parentElement);
    }
    return () => { ro.disconnect(); if (ro2) ro2.disconnect(); };
  }, [wrapEl]);

  const onImgLoad = (e) => {
    const { naturalWidth, naturalHeight } = e.target;
    if (naturalWidth && naturalHeight) setImgRatio(naturalWidth / naturalHeight);
  };

  let width = null;
  if (imgRatio && height) {
    width = height * imgRatio;
    if (containerWidth) width = Math.min(width, containerWidth * maxWidthRatio);
    width = Math.max(width, minWidth);
  }

  return { wrapRef, width, onImgLoad };
}
