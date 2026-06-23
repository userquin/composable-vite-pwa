if (import.meta.hot) {
  // 1. Create the host and attach Shadow DOM to isolate styles
  const host = document.createElement('div')
  host.setAttribute('id', 'vite-pwa-ui-switcher')
  const shadow = host.attachShadow({ mode: 'open' })

  // 2. Setup styles (max z-index to keep it floating above everything)
  const style = document.createElement('style')
  style.textContent = `
    .pwa-switcher {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 2147483647;
      background: #42b883;
      color: white;
      border: none;
      border-radius: 50px;
      padding: 10px 20px;
      font-family: system-ui, -apple-system, sans-serif;
      font-weight: bold;
      cursor: grab;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      transition: transform 0.2s ease;
      user-select: none;
      touch-action: none;
      white-space: nowrap;
      min-width: 140px; 
      box-sizing: border-box;
    }
    .pwa-switcher:hover {
      transform: scale(1.05);
    }
    .pwa-switcher:active {
      cursor: grabbing;
    }
  `

  // 3. Mount the button
  const button = document.createElement('button')
  button.className = 'pwa-switcher'

  // Initial state (injected from the server based on ctx.dev.options.swType)
  let currentType = import.meta.PWA_DEV_CURRENT_SW_TYPE
  button.textContent = `⚙️ PWA: ${currentType}`

  // --- DRAG & DROP LOGIC ---
  let hasDragged = false
  let startX = 0
  let startY = 0
  let initialLeft = 0
  let initialTop = 0

  // Helper Limits
  const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val))

  const checkBounds = () => {
    if (button.style.left && button.style.left !== 'auto') {
      const currentLeft = Number.parseFloat(button.style.left)
      const currentTop = Number.parseFloat(button.style.top)

      const maxX = document.documentElement.clientWidth - button.offsetWidth
      const maxY = document.documentElement.clientHeight - button.offsetHeight

      button.style.left = `${clamp(currentLeft, 0, maxX)}px`
      button.style.top = `${clamp(currentTop, 0, Math.max(0, maxY))}px`
    }
  }

  // Handle Window Resizing (e.g. opening DevTools)
  window.addEventListener('resize', checkBounds)

  // Handle the drag movement
  const onMouseMove = (e: MouseEvent | PointerEvent) => {
    const dx = e.clientX - startX
    const dy = e.clientY - startY

    // Threshold: only consider it a drag if moved more than 3 pixels
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      hasDragged = true
    }

    let newLeft = initialLeft + dx
    let newTop = initialTop + dy

    // Calculate boundaries using documentElement
    const maxX = document.documentElement.clientWidth - button.offsetWidth
    const maxY = document.documentElement.clientHeight - button.offsetHeight

    // Clamp the values
    newLeft = clamp(newLeft, 0, maxX)
    newTop = clamp(newTop, 0, maxY)

    button.style.left = `${newLeft}px`
    button.style.top = `${newTop}px`
  }

  // Handle the drop and cleanup
  const onMouseUp = () => {
    button.style.transition = 'transform 0.2s ease' // Restore hover transitions

    // CRITICAL: Remove global listeners to prevent memory leaks
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)
  }

  // Start the drag
  button.addEventListener('mousedown', (e) => {
    hasDragged = false
    startX = e.clientX
    startY = e.clientY

    // Get current absolute position to prevent jumping
    button.style.transform = 'none'
    const rect = button.getBoundingClientRect()

    // Switch from bottom/right to left/top positioning dynamically
    button.style.left = `${rect.left}px`
    button.style.top = `${rect.top}px`
    button.style.bottom = 'auto'
    button.style.right = 'auto'
    button.style.transition = 'none' // Disable hover transition while dragging

    initialLeft = rect.left
    initialTop = rect.top

    // Attach global listeners ONLY when the button is actively pressed
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  })

  // 4. Click Logic (The Switcher)
  button.addEventListener('click', (e) => {
    // If the user was just dragging the button, ignore the click
    if (hasDragged) {
      e.preventDefault()
      return
    }

    // Toggle the SW type
    currentType = currentType === 'classic' ? 'module' : 'classic'
    button.textContent = `⚙️ PWA: ${currentType}`

    // Ensure it doesn't stay out of bounds after changing text
    checkBounds()

    // eslint-disable-next-line no-console
    console.log(`[Vite PWA] Switching Service Worker to: ${currentType}`)

    // Send the message via Vite's WebSocket to the Node server
    import.meta.hot!.send('pwa:dev-switch-sw', { type: currentType })
  })

  // 5. Assemble and inject into the document body
  shadow.appendChild(style)
  shadow.appendChild(button)
  document.body.appendChild(host)
}
