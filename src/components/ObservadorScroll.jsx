import { useEffect, useRef } from "react"

function ObservadorScroll({ onVisible }) {
  const ref = useRef(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onVisible()
        }
      },
      { threshold: 0.1 }
    )

    if (ref.current) observer.observe(ref.current)

    return () => observer.disconnect()
  }, [onVisible])

  return <div ref={ref} className="h-4"></div>
}

export default ObservadorScroll