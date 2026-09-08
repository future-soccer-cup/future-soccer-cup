import { useCallback, useEffect, useState } from "react";

/**
 * Para banners full-bleed (ancho fijo = 100% del contenedor). Calcula el ALTO
 * exacto (en px) para que la imagen se muestre COMPLETA según su proporción real,
 * sin recortar ni estirar — igual que `useAutoFitSideImage` pero resolviendo el
 * alto en vez del ancho (aquí el ancho ya es fijo por ser full-bleed).
 * `minHeight`/`maxHeight` solo evitan extremos poco prácticos (foto panorámica
 * gigante o casi cuadrada) sin nunca recortar el contenido.
 */
export function useAutoFitBannerHeight({ minHeight = 260, maxHeight = 700, fallbackHeight = 420 } = {}) {
  const [wrapEl, setWrapEl] = useState(null);
  const wrapRef = useCallback((node) => setWrapEl(node), []);
  const [containerWidth, setContainerWidth] = useState(0);
  const [imgRatio, setImgRatio] = useState(null);

  useEffect(() => {
    if (!wrapEl) return;
    setContainerWidth(wrapEl.getBoundingClientRect().width);
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) setContainerWidth(entry.contentRect.width);
    });
    ro.observe(wrapEl);
    return () => ro.disconnect();
  }, [wrapEl]);

  const onImgLoad = (e) => {
    const { naturalWidth, naturalHeight } = e.target;
    if (naturalWidth && naturalHeight) setImgRatio(naturalWidth / naturalHeight);
  };

  let height = fallbackHeight;
  if (imgRatio && containerWidth) {
    height = Math.min(Math.max(containerWidth / imgRatio, minHeight), maxHeight);
  }

  return { wrapRef, height, onImgLoad };
}
