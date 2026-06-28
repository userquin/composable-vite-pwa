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
      /* --- LIGHT THEME (Backgrounds are DARK) --- */
      --pwa-bg: #006d44;       
      --pwa-color: #ffffff;    
      --pwa-logo-w: #b39aff;   
      --pwa-logo-bolt: #efcd0a; 
      
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
      
      outline: none;
      -webkit-tap-highlight-color: transparent;
      
      transition: all 0.4s ease, background-color 0.3s ease, color 0.3s ease;
      
      user-select: none;
      touch-action: none;
      box-sizing: border-box;
      opacity: 0;
      pointer-events: auto;
      
      display: flex;
      align-items: center;
      justify-content: center;
      white-space: nowrap;
      overflow: hidden;
    }

    .pwa-switcher:focus,
    .pwa-switcher:focus-visible {
      outline: none;
    }

    .pwa-switcher.is-module {
      --pwa-bg: #6c3bff;       
      --pwa-color: #ffffff;    
      --pwa-logo-w: #77daa3;   
    }

    /* --- OFFLINE / ERROR STATE --- */
    .pwa-switcher.is-offline {
      --pwa-bg: #dc2626 !important;     
      --pwa-color: #ffffff !important;  
      --pwa-logo-w: #fca5a5 !important; 
      --pwa-logo-bolt: #fde047 !important; 
      cursor: not-allowed;
    }

    /* --- DARK THEME (Backgrounds are LIGHT) --- */
    @media (prefers-color-scheme: dark) {
      .pwa-switcher {
        --pwa-bg: #77daa3;     
        --pwa-color: #003920;  
        --pwa-logo-w: #6c3bff; 
        --pwa-logo-bolt: #827717; 
      }
      .pwa-switcher.is-module {
        --pwa-bg: #b39aff;     
        --pwa-color: #0b0033;  
        --pwa-logo-w: #006d44; 
      }
      .pwa-switcher.is-offline {
        --pwa-bg: #fca5a5 !important;   
        --pwa-color: #7f1d1d !important; 
        --pwa-logo-w: #dc2626 !important; 
        --pwa-logo-bolt: #9a3412 !important; 
      }
    }

    .pwa-switcher::before {
      content: '';
      position: absolute;
      inset: -6px;
      z-index: -1;
      border-radius: 50px;
    }

    .pwa-switcher.ready {
      opacity: 1;
      pointer-events: auto;
    }

    .pwa-switcher.is-idle {
      padding: 8px; 
      transform: scale(0.9);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.25), 0 2px 6px rgba(0, 0, 0, 0.15);
    }

    .icon-container {
      position: relative;
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .brand-logo, .gear-icon {
      position: absolute;
      transition: all 0.4s ease;
    }

    .brand-logo {
      width: 26px; 
      height: 26px;
      opacity: 0;
      transform: scale(0.5) rotate(-30deg);
    }

    .pwa-switcher.is-idle .brand-logo {
      opacity: 1;
      transform: scale(1) rotate(0deg);
    }

    .gear-icon {
      width: 28px;
      height: 28px;
      opacity: 1;
      transform: scale(1) rotate(0deg);
    }

    .pwa-switcher.is-idle .gear-icon {
      opacity: 0;
      transform: scale(0.5) rotate(90deg);
    }

    /* Hover animations blocked if .is-offline is active */
    .pwa-switcher:not(.is-idle):not(.is-loading):not(.is-offline):hover .gear-icon,
    .pwa-switcher:not(.is-idle):not(.is-loading):not(.is-offline):focus-visible .gear-icon {
      transform: rotate(90deg);
    }

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

    .text-wrapper {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      margin-left: 10px;
      max-width: 300px; 
      opacity: 1;
      overflow: hidden;
      transition: all 0.4s ease;
    }

    .pwa-switcher.is-idle .text-wrapper {
      max-width: 0;
      opacity: 0;
      margin-left: 0;
    }

    .brand-header {
      display: flex;
      align-items: center;
      gap: 2px;
      margin-bottom: 3px;
    }

    .brand-text {
      font-size: 9px;
      font-weight: 600;
      letter-spacing: 0.5px;
      line-height: 1;
    }

    .offline-icon {
      width: 0; 
      height: 11px;
      opacity: 0;
      transform: scale(0);
      transform-origin: center;
      transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    .pwa-switcher.is-offline .offline-icon {
      width: 11px; 
      opacity: 1;
      transform: scale(1);
    }

    .content-wrapper {
      display: grid;
      align-items: center;
    }

    .arrows-icon {
      width: 14px;
      height: 14px;
      flex-shrink: 0;
      margin-right: 4px;
    }

    .text-base, .text-hover {
      grid-area: 1 / 1; 
      overflow: hidden;
      white-space: nowrap;
      font-size: 14px;
      font-weight: bold;
      line-height: 1;
    }

    .text-base {
      display: flex;
      align-items: center;
      max-width: 150px;
      opacity: 1;
      transition: max-width 0.4s ease, opacity 0.4s ease;
    }
    
    .text-hover {
      display: flex;
      align-items: center;
      max-width: 0;
      opacity: 0;
      transition: max-width 0.4s ease, opacity 0.4s ease;
    }

    /* Hover animations blocked if .is-offline is active */
    .pwa-switcher:not(.is-idle):not(.is-loading):not(.is-offline):hover .text-base,
    .pwa-switcher:not(.is-idle):not(.is-loading):not(.is-offline):focus-visible .text-base {
      max-width: 0;
      opacity: 0;
    }

    .pwa-switcher:not(.is-idle):not(.is-loading):not(.is-offline):hover .text-hover,
    .pwa-switcher:not(.is-idle):not(.is-loading):not(.is-offline):focus-visible .text-hover {
      max-width: 300px; 
      opacity: 1;
    }
  `

  // 3. Mount content
  const currentType = import.meta.PWA_DEV_CURRENT_SW_TYPE
  const nextType = currentType === 'classic' ? 'module' : 'classic'

  button.innerHTML = `
    <div class="icon-container">
      <svg class="brand-logo" viewBox="0 0 155 155" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M50.6853 104.345C48.3909 100.398 46.0047 96.3602 43.7103 92.4138C43.5268 92.1385 43.435 91.8632 43.5267 91.4043C45.8211 84.4293 48.1155 77.3626 50.4099 70.3876C50.4099 70.2959 50.5017 70.1123 50.5935 69.837C53.255 75.0682 55.8247 80.2076 58.4862 85.4389C58.6697 85.0717 58.7615 84.7964 58.8533 84.5211C62.4326 73.508 66.0118 62.5867 69.5911 51.5736C69.7746 51.1147 69.9582 50.9312 70.417 51.0229C73.6292 51.0229 76.8413 51.0229 80.1453 51.0229C80.6959 51.0229 80.8795 51.2065 81.063 51.6654C84.367 62.5867 87.6709 73.4162 90.9748 84.3375C91.0666 84.6129 91.1584 84.98 91.3419 85.4389C91.8008 84.5211 92.1679 83.6033 92.4432 82.7774C96.9402 72.3149 101.345 61.9443 105.842 51.4818C105.934 51.2065 106.026 51.0229 106.393 51.0229C110.982 51.0229 115.571 51.0229 120.068 51.0229C120.068 51.0229 120.16 51.0229 120.251 51.0229C119.701 52.3078 119.242 53.5009 118.783 54.7857C112.175 71.0301 105.659 87.3661 99.0511 103.61C98.9593 103.794 98.7757 103.978 98.8675 104.253C94.0952 104.253 89.3229 104.253 84.5505 104.253C84.6423 104.069 84.5505 103.794 84.4587 103.61C84.0916 102.417 83.7245 101.224 83.3574 100.031C80.6042 91.3125 77.9426 82.6856 75.1894 73.9669C75.1894 73.7833 75.1894 73.5998 74.9141 73.508C71.5184 83.6951 68.2144 93.974 64.8187 104.161C60.0464 104.345 55.3658 104.345 50.6853 104.345Z" fill="var(--pwa-logo-w)"/>
        <path d="M7 104.345C7 86.8155 7 69.2863 7 51.7571C7 51.2065 7.09178 51.0229 7.73421 51.0229C15.168 51.0229 22.6019 51.0229 30.0357 51.0229C34.1656 51.0229 38.0202 51.9407 41.3241 54.5104C42.7008 55.5199 43.8938 56.8048 44.9034 58.2732C45.0869 58.5485 45.0869 58.7321 44.9952 59.0074C42.2419 67.5426 39.3968 76.1695 36.6436 84.7046C36.5518 85.0717 36.3682 85.1635 36.0011 85.2553C34.0738 85.7142 32.0548 85.9895 30.0357 85.9895C27.0071 85.9895 24.0703 85.9895 21.0417 85.9895C20.6746 85.9895 20.5828 85.9895 20.5828 86.4484C20.5828 92.322 20.5828 98.2874 20.5828 104.161V104.253C16.0858 104.345 11.497 104.345 7 104.345ZM20.5828 68.4603C20.5828 70.6629 20.5828 72.8656 20.5828 75.16C20.5828 75.6188 20.6746 75.7106 21.1335 75.7106C22.2348 75.7106 23.4279 75.7106 24.5292 75.7106C26.0894 75.7106 27.6495 75.7106 29.2097 75.3435C30.5864 74.9764 31.8712 74.5175 32.6972 73.3244C34.441 70.8465 34.6245 68.0932 33.5232 65.34C32.6054 62.862 30.4946 61.8525 28.0166 61.5771C25.7223 61.3018 23.4279 61.4854 21.1335 61.3936C20.6746 61.3936 20.5828 61.5771 20.5828 61.9442C20.5828 64.1469 20.5828 66.3495 20.5828 68.4603Z" fill="currentColor"/>
        <path d="M128.167 92.3636H114L133.833 44V71.6364H148L128.167 120V92.3636Z" fill="var(--pwa-logo-bolt)"/>
      </svg>
      <svg class="gear-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="3"></circle>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
      </svg>
    </div>
    <div class="text-wrapper">
      <div class="brand-header">
        <span class="brand-text">Vite PWA</span>
        <svg class="offline-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
          <path fill="currentColor" d="m19.75 22.6l-9.4-9.45q-1.175.275-2.187.825T6.35 15.35l-2.1-2.15q.8-.8 1.725-1.4t1.975-1.05L5.7 8.5q-1.025.525-1.913 1.163T2.1 11.1L0 8.95q.8-.8 1.663-1.437T3.5 6.3L1.4 4.2l1.4-1.4l18.4 18.4zm-1.85-7.55l-.725-.725l-.725-.725l-3.6-3.6q2.025.2 3.787 1.025T19.75 13.2zm4-3.95q-1.925-1.925-4.462-3.012T12 7q-.525 0-1.012.038T10 7.15L7.45 4.6q1.1-.3 2.238-.45T12 4q3.55 0 6.625 1.325T24 8.95zM12 21l-3.525-3.55q.7-.7 1.613-1.075T12 16t1.913.375t1.612 1.075z" />
        </svg>
      </div>
      <div class="content-wrapper">
        <span class="text-base">${currentType.toUpperCase()}</span>
        <span class="text-hover">
          <svg class="arrows-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="M16 21l4-4-4-4"/><path d="M20 17H4"/>
          </svg>
          SWITCH TO ${nextType.toUpperCase()}
        </span>
      </div>
    </div>
  `

  if (currentType === 'module') {
    button.classList.add('is-module')
  }

  // --- LOGIC ---
  let hasDragged = false
  let loading = false
  let isHovered = false
  let isFocused = false
  let startX = 0
  let startY = 0
  let initialLeft = 0
  let initialTop = 0
  let idleTimeout: ReturnType<typeof setTimeout>

  // Separamos el estado físico de la red del estado de HMR
  let isOnline = navigator.onLine ?? true
  let isHMRConnected = true // Por defecto asumimos que arranca conectado

  // Única fuente de la verdad para saber si el componente está 100% operativo
  const isConnected = () => isOnline && isHMRConnected

  const STORAGE_KEY = 'unplugin-pwa-switcher-pos'
  const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val))

  const savePosition = () => {
    if (button.style.left && button.style.left !== 'auto') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        x: Number.parseFloat(button.style.left),
        y: Number.parseFloat(button.style.top),
      }))
    }
  }

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

      savePosition()
    }
  }

  const setIdle = (idle: boolean) => {
    if (idle) {
      button.classList.add('is-idle')
    }
    else {
      button.classList.remove('is-idle')
    }
  }

  const startIdleTimer = () => {
    clearTimeout(idleTimeout)
    setIdle(false)
    if (!isHovered && !isFocused && !loading && isConnected()) {
      idleTimeout = setTimeout(() => {
        setIdle(true)
      }, 3000)
    }
  }

  // Máquina de estados para la Conexión
  function checkConnection() {
    if (!isConnected()) {
      button.classList.add('is-offline')
      button.classList.remove('is-idle')
      clearTimeout(idleTimeout)
    }
    else {
      button.classList.remove('is-offline')
      if (isPWASwitcherReady) {
        startIdleTimer()
      }
    }
  }

  window.addEventListener('resize', checkBounds)

  button.addEventListener('mouseenter', () => {
    isHovered = true
    setIdle(false)
    clearTimeout(idleTimeout)
  })

  button.addEventListener('mouseleave', () => {
    isHovered = false
    startIdleTimer()
  })

  button.addEventListener('focus', () => {
    isFocused = true
    setIdle(false)
    clearTimeout(idleTimeout)
  })

  button.addEventListener('blur', () => {
    isFocused = false
    startIdleTimer()
  })

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
    button.style.transition = 'all 0.4s ease, background-color 0.3s ease, color 0.3s ease'

    document.documentElement.style.removeProperty('cursor')
    button.style.cursor = ''

    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)

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

  button.addEventListener('click', async (e) => {
    if (hasDragged || loading || !isConnected()) {
      e.preventDefault()
      return
    }

    loading = true
    clearTimeout(idleTimeout)
    button.classList.add('is-loading')

    await new Promise(resolve => setTimeout(resolve, 256))

    // eslint-disable-next-line no-console
    console.log(`[Vite PWA] Switching Service Worker to: ${nextType}...`)
    try {
      import.meta.hot!.send(import.meta.PWA_DEV_PWA_SWITCHER_EVENT_NAME, { type: nextType })
    }
    catch (e) {
      console.error(`[Vite PWA] Error switching Service Worker to: ${nextType}...`, e)
      button.classList.remove('is-loading')
      loading = false
      await new Promise(resolve => setTimeout(resolve, 0))
      startIdleTimer()
    }
  })

  // Restore the position before mounting to avoid visual jumps
  restorePosition()

  // Assemble and inject into the document body
  shadow.appendChild(style)
  shadow.appendChild(button)
  document.body.appendChild(host)

  // Ensure bounds are respected upon load
  requestAnimationFrame(() => {
    checkBounds()
  })

  window.addEventListener('online', () => {
    isOnline = true
    checkConnection()
  })
  window.addEventListener('offline', () => {
    isOnline = false
    console.warn('[Vite PWA] Network disconnected')
    checkConnection()
  })

  import.meta.hot.on('vite:ws:connect', () => {
    isHMRConnected = true
    // eslint-disable-next-line no-console
    console.info('[Vite PWA] HMR connected')
    checkConnection()
  })

  import.meta.hot.on('vite:ws:disconnect', () => {
    isHMRConnected = false
    console.warn('[Vite PWA] HMR disconnected')
    checkConnection()
  })

  import.meta.hot.on('vite:error', (err) => {
    console.error(`[Vite PWA] HMR error:`, err)
    if (loading) {
      loading = false
      button.classList.remove('is-loading')
    }
    // isHMRConnected = false
    checkConnection()
  })

  checkConnection()
}
