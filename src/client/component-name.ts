/**
 * Resolves the owning framework component name for a DOM element.
 *
 * Probes React fiber trees, Vue component instances, and Svelte component
 * context — returns null for plain vanilla DOM or when no metadata is found.
 */
export function getComponentName(element: Element): string | null {
  return getReactComponentName(element)
    ?? getVueComponentName(element)
    ?? getSvelteComponentName(element)
    ?? null
}

/** Traverses React's internal fiber tree to find the nearest named component. */
function getReactComponentName(element: Element): string | null {
  const el = element as unknown as Record<string, unknown>

  for (const key of Object.keys(el)) {
    if (!key.startsWith('__reactFiber$') && !key.startsWith('__reactInternalInstance$'))
      continue

    let fiber = el[key] as Record<string, unknown> | null
    while (fiber) {
      const type = fiber.type
      if (typeof type === 'function' || typeof type === 'object') {
        const name = typeof type === 'function'
          ? (type as { displayName?: string, name?: string }).displayName || (type as { name?: string }).name
          : (type as { displayName?: string })?.displayName

        if (name && name !== 'Fragment' && !name.startsWith('_'))
          return name
      }
      fiber = fiber.return as Record<string, unknown> | null
    }
  }

  return null
}

/** Walks up Vue's component instance chain to find a named ancestor. */
function getVueComponentName(element: Element): string | null {
  const el = element as unknown as Record<string, unknown>

  const instance = el.__vueParentComponent as Record<string, unknown> | undefined
  if (!instance)
    return null

  let current: Record<string, unknown> | null = instance
  while (current) {
    const type = current.type as Record<string, unknown> | undefined
    const name = type?.name as string | undefined
      ?? type?.__name as string | undefined

    if (name)
      return name

    current = current.parent as Record<string, unknown> | null
  }

  return null
}

/** Looks for Svelte component metadata attached to a DOM element. */
function getSvelteComponentName(element: Element): string | null {
  const el = element as unknown as Record<string, unknown>

  // Svelte 4: __svelte_meta
  const meta = el.__svelte_meta as { loc?: { file?: string } } | undefined
  if (meta?.loc?.file) {
    const file = meta.loc.file
    const match = file.match(/([^/\\]+)\.\w+$/)
    if (match)
      return match[1]
  }

  // Svelte 5: $$host / $$ context
  const host = el.$$host as Record<string, unknown> | undefined
  if (host) {
    const ctor = host.constructor as { name?: string } | undefined
    if (ctor?.name && ctor.name !== 'Object')
      return ctor.name
  }

  return null
}
