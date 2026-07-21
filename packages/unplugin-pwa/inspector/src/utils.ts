import type { ShallowRef } from 'vue'
import { onMounted, onUnmounted } from 'vue'

export interface ScrollSpyHeader {
  id: string
  link: string
  element: HTMLElement
}

export function useActiveAnchor(
  headers: ScrollSpyHeader[],
  container: Readonly<ShallowRef<HTMLElement | null>>,
  marker: Readonly<ShallowRef<HTMLElement | null>>,
) {
  let isManualScrolling = false
  let containerWithScroll: HTMLElement | null = null
  let scrollTimeout: ReturnType<typeof setTimeout>

  function updateMarker(id: string) {
    if (!container.value)
      return

    const links = container.value.querySelectorAll('li a')
    for (let i = 0; i < links.length; i++) {
      links[i].classList.remove('active')
    }

    const activeLink = container.value.querySelector(`li a[href="/#${id}"]`) as HTMLElement
    if (activeLink) {
      activeLink.classList.add('active')
      if (marker.value) {
        marker.value.style.top = `${activeLink.offsetTop + 7}px`
        marker.value.style.opacity = '1'
      }
    }
    else if (marker.value) {
      marker.value.style.top = `7px`
      marker.value.style.opacity = '0'
    }
  }

  function setActiveLink() {
    if (isManualScrolling || !headers || headers.length === 0 || !containerWithScroll)
      return

    const containerTop = containerWithScroll.getBoundingClientRect().top
    let activeId = ''

    for (let i = headers.length - 1; i >= 0; i--) {
      const header = headers[i]
      const el = document.getElementById(header.id)
      if (!el)
        continue

      const rect = el.getBoundingClientRect()
      if (rect.top <= containerTop + 30) {
        activeId = header.id
        break
      }
    }

    if (!activeId && headers.length > 0) {
      activeId = headers[0].id
    }

    updateMarker(activeId)
  }

  function onScroll() {
    if (isManualScrolling) {
      clearTimeout(scrollTimeout)
      scrollTimeout = setTimeout(() => {
        isManualScrolling = false
      }, 50)
      return
    }
    window.requestAnimationFrame(() => {
      setActiveLink()
    })
  }

  function goTo(e: MouseEvent, id: string) {
    e.preventDefault()
    const element = document.getElementById(id)

    if (element && containerWithScroll) {
      isManualScrolling = true
      updateMarker(id)

      const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const containerRect = containerWithScroll.getBoundingClientRect()
      const elementRect = element.getBoundingClientRect()
      const distance = Math.abs(elementRect.top - containerRect.top)

      const behavior = prefersReducedMotion || distance > 500 ? 'instant' : 'smooth'

      containerWithScroll.scrollTo({
        top: element.offsetTop - 24,
        behavior,
      })

      history.replaceState(null, '', `#${id}`)

      clearTimeout(scrollTimeout)
      scrollTimeout = setTimeout(() => {
        isManualScrolling = false
      }, 50)
    }
  }

  onMounted(() => {
    containerWithScroll = document.querySelector('.overflow-y-auto')
    if (containerWithScroll) {
      const sw = containerWithScroll.offsetWidth - containerWithScroll.clientWidth
      document.documentElement.style.setProperty('--scrollbar', `${sw}px`)
      containerWithScroll.addEventListener('scroll', onScroll)
      setTimeout(setActiveLink, 100)
    }
  })

  onUnmounted(() => {
    if (containerWithScroll) {
      containerWithScroll.removeEventListener('scroll', onScroll)
      containerWithScroll = null
    }
    if (scrollTimeout) {
      clearTimeout(scrollTimeout)
    }
  })

  return { goTo }
}
