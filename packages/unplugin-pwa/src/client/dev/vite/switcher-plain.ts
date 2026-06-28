declare global {
  interface Window {
    setDevPWASwitcherReady: () => void
  }
}

window.setDevPWASwitcherReady = () => {}
if (import.meta.hot && import.meta.PWA_ESM_FALLBACK_SW) {
  // 1. Create the host and attach Shadow DOM to isolate styles
  const host = document.createElement('div')
  host.setAttribute('id', 'vite-pwa-ui-switcher')
  const shadow = host.attachShadow({ mode: 'open' })

  const button = document.createElement('button')
  button.className = 'pwa-switcher'

  let isPWASwitcherReady = false
  window.setDevPWASwitcherReady = () => {
    if (!isPWASwitcherReady) {
      isPWASwitcherReady = true
      button.classList.add('ready')
      // eslint-disable-next-line no-console
      console.log(`[Vite PWA] Switcher UI is now ready.`)
    }
  }

  // 2. Setup styles
  const style = document.createElement('style')
  style.textContent = `
    .pwa-switcher {
      /* --- LIGHT THEME (WCAG AA COMPLIANT) --- */
      --pwa-bg: #006d44;       /* Vue Green Primary */
      --pwa-color: #ffffff;    /* Vue Green On-Primary */
      
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 2147483647;
      background-color: var(--pwa-bg);
      color: var(--pwa-color);
      border: none;
      border-radius: 50px;
      padding: 8px 16px;
      font-family: system-ui, -apple-system, sans-serif;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      transition: transform 0.2s ease, opacity 0.4s ease, background-color 0.3s ease, color 0.3s ease;
      user-select: none;
      touch-action: none;
      box-sizing: border-box;
      opacity: 0;
      pointer-events: none;
      
      /* Layout to align the gear and the text block horizontally */
      display: flex;
      align-items: center;
    }

    .pwa-switcher.is-module {
      /* Vite Official "Electric" color */
      --pwa-bg: #6c3bff;       
      --pwa-color: #ffffff;    
    }

    /* --- DARK THEME (WCAG AA COMPLIANT) --- */
    @media (prefers-color-scheme: dark) {
      .pwa-switcher {
        --pwa-bg: #77daa3;     /* Vue Green Primary Dark */
        --pwa-color: #003920;  /* Vue Green On-Primary Dark */
      }
      .pwa-switcher.is-module {
        /* Vite Official "Vite" light purple color */
        --pwa-bg: #b39aff;     
        --pwa-color: #0b0033;  /* Very dark blue for >10:1 AAA contrast */
      }
    }

    /* INVISIBLE SHIELD: Fixes the hover flickering edge case */
    .pwa-switcher::before {
      content: '';
      position: absolute;
      inset: -6px;
      z-index: -1;
      border-radius: 50px;
    }

    .pwa-switcher:not(.is-loading):hover {
      transform: scale(1.02);
    }

    .pwa-switcher.ready {
      opacity: 1;
      pointer-events: auto;
    }

    /* --- LOADING STATE LOGIC --- */
    .pwa-switcher.is-loading {
      pointer-events: none;
      opacity: 0.8;
    }

    @keyframes pwa-spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .pwa-switcher.is-loading .gear-icon {
      animation: pwa-spin 1.2s linear infinite;
    }

    /* --- ICONS LOGIC --- */
    .gear-icon {
      /* Sized to perfectly span the two lines of text */
      width: 28px;
      height: 28px;
      flex-shrink: 0;
      transition: transform 0.4s ease;
    }

    /* Only rotate 90deg on hover if NOT loading */
    .pwa-switcher:not(.is-loading):hover .gear-icon {
      transform: rotate(90deg);
    }

    .arrows-icon {
      width: 14px;
      height: 14px;
      flex-shrink: 0;
      margin-right: 4px;
    }

    /* --- 2-ROW TEXT LAYOUT --- */
    .text-wrapper {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      margin-left: 10px;
    }

    .brand-text {
      font-size: 9px;
      font-weight: 600;
      letter-spacing: 0.5px;
      line-height: 1;
      margin-bottom: 3px;
    }

    .content-wrapper {
      display: flex;
      align-items: center;
    }

    .text-base, .text-hover {
      overflow: hidden;
      white-space: nowrap;
      font-size: 14px;
      font-weight: bold;
      line-height: 1;
    }

    /* Default collapsed state */
    .text-base {
      max-width: 80px;
      opacity: 1;
      transition: max-width 0.3s ease, opacity 0.3s ease;
    }
    
    .text-hover {
      max-width: 0;
      opacity: 0;
      display: inline-flex;
      align-items: center;
      /* Collapse fast on un-hover to avoid width bulge */
      transition: max-width 0.2s ease, opacity 0.2s ease;
    }

    /* Hover expanded state */
    .pwa-switcher:not(.is-loading):hover .text-base {
      max-width: 0;
      opacity: 0;
      transition: max-width 0.2s ease, opacity 0.2s ease;
    }

    .pwa-switcher:not(.is-loading):hover .text-hover {
      max-width: 180px;
      opacity: 1;
      transition: max-width 0.3s ease, opacity 0.3s ease;
    }
  `

  // 3. Mount the button content
  const currentType = import.meta.PWA_DEV_CURRENT_SW_TYPE
  const nextType = currentType === 'classic' ? 'module' : 'classic'

  // Gear SVG Icon
  const gearIconSvg = `
    <svg class="gear-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="3"></circle>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
    </svg>
  `

  // Switcher/Arrows SVG Icon
  const arrowsIconSvg = `
    <svg class="arrows-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M8 3 4 7l4 4"/>
      <path d="M4 7h16"/>
      <path d="M16 21l4-4-4-4"/>
      <path d="M20 17H4"/>
    </svg>
  `

  // Build HTML layout with the text wrapper for the brand name
  button.innerHTML = `
    ${gearIconSvg}
    <div class="text-wrapper">
      <span class="brand-text">Vite PWA</span>
      <div class="content-wrapper">
        <span class="text-base">${currentType.toUpperCase()}</span>
        <span class="text-hover">
          ${arrowsIconSvg}
          SWITCH TO ${nextType.toUpperCase()}
        </span>
      </div>
    </div>
  `

  if (currentType === 'module') {
    button.classList.add('is-module')
  }

  // --- DRAG, DROP & STORAGE LOGIC ---
  let hasDragged = false
  let startX = 0
  let startY = 0
  let initialLeft = 0
  let initialTop = 0

  const STORAGE_KEY = 'unplugin-pwa-switcher-pos'
  const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val))

  // Persist the coordinates to localStorage
  const savePosition = () => {
    if (button.style.left && button.style.left !== 'auto') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        x: Number.parseFloat(button.style.left),
        y: Number.parseFloat(button.style.top),
      }))
    }
  }

  // Load the coordinates from localStorage
  const restorePosition = () => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const { x, y } = JSON.parse(saved)
        button.style.left = `${x}px`
        button.style.top = `${y}px`
        button.style.bottom = 'auto'
        button.style.right = 'auto'
      }
      catch {
        // Silently ignore corrupted local storage data
      }
    }
  }

  const checkBounds = () => {
    if (button.style.left && button.style.left !== 'auto') {
      const currentLeft = Number.parseFloat(button.style.left)
      const currentTop = Number.parseFloat(button.style.top)

      const maxX = document.documentElement.clientWidth - button.offsetWidth
      const maxY = document.documentElement.clientHeight - button.offsetHeight

      const newLeft = clamp(currentLeft, 0, maxX)
      const newTop = clamp(currentTop, 0, Math.max(0, maxY))

      button.style.left = `${newLeft}px`
      button.style.top = `${newTop}px`

      // Save the clamped position so it persists correctly after a window resize
      savePosition()
    }
  }

  window.addEventListener('resize', checkBounds)

  const onMouseMove = (e: MouseEvent | PointerEvent) => {
    const dx = e.clientX - startX
    const dy = e.clientY - startY

    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      hasDragged = true
    }

    const newLeft = initialLeft + dx
    const newTop = initialTop + dy

    const maxX = document.documentElement.clientWidth - button.offsetWidth
    const maxY = document.documentElement.clientHeight - button.offsetHeight

    button.style.left = `${clamp(newLeft, 0, maxX)}px`
    button.style.top = `${clamp(newTop, 0, maxY)}px`
  }

  const onMouseUp = () => {
    button.style.transition = 'transform 0.2s ease, opacity 0.4s ease, background-color 0.3s ease, color 0.3s ease'

    document.documentElement.style.removeProperty('cursor')
    button.style.cursor = ''

    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)

    // Save position to localStorage after dragging
    savePosition()
  }

  button.addEventListener('mousedown', (e) => {
    hasDragged = false
    startX = e.clientX
    startY = e.clientY

    document.documentElement.style.setProperty('cursor', 'grabbing', 'important')
    button.style.cursor = 'grabbing'

    button.style.transform = 'none'
    const rect = button.getBoundingClientRect()
    button.style.transform = ''

    button.style.left = `${rect.left}px`
    button.style.top = `${rect.top}px`
    button.style.bottom = 'auto'
    button.style.right = 'auto'
    button.style.transition = 'none'

    initialLeft = rect.left
    initialTop = rect.top

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  })

  let loading = false

  // 4. Click Logic
  button.addEventListener('click', async (e) => {
    if (hasDragged || loading) {
      e.preventDefault()
      return
    }

    loading = true

    // Add loading state to disable interactions and start spinning animation
    button.classList.add('is-loading')

    await new Promise(resolve => setTimeout(resolve, 256))

    // eslint-disable-next-line no-console
    console.log(`[Vite PWA] Switching Service Worker to: ${nextType}...`)

    // Send the custom HMR message. The page reload handles updating the context visually
    import.meta.hot!.send(import.meta.PWA_DEV_PWA_SWITCHER_EVENT_NAME, { type: nextType })
  })

  // Restore the position before mounting to avoid visual jumps
  restorePosition()

  // 5. Assemble and inject into the document body
  shadow.appendChild(style)
  shadow.appendChild(button)
  document.body.appendChild(host)

  // Ensure bounds are respected upon load (Edge Case: user shrank the window or switched to mobile view)
  // We use requestAnimationFrame so the browser has time to calculate button.offsetWidth after it's in the DOM
  requestAnimationFrame(() => {
    checkBounds()
  })
}
