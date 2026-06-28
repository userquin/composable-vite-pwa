import type { ServiceWorkerAssetNormalizer } from '../vite-context'

export const defaultServiceWorkerAssetsNormalizer: ServiceWorkerAssetNormalizer = (
  hook,
  depType,
  id,
) => {
  if (depType === 'sw') {
    return [id.startsWith('/') ? id.slice(1) : id, id]
  }

  if (hook === 'load') {
    return [id, id]
  }

  const assetId = id.startsWith('./') ? id.slice(1) : id
  return [assetId, assetId]
}
