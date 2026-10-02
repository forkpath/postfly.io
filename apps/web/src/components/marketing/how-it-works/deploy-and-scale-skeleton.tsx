import { useEffect, useRef, useState } from 'react'

import { motion, useMotionValue } from 'motion/react'

import { DeployCardMotion } from './deployment-card'
import { deployCards } from './deployment-data'

export const DeployAndScaleSkeleton = () => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerHeight, setContainerHeight] = useState(0)

  const extendedCards = [...deployCards, ...deployCards, ...deployCards]

  const cardHeight = 64
  const gap = 4
  const itemHeight = cardHeight + gap
  const offset = (containerHeight - cardHeight) / 2

  useEffect(() => {
    const observer = new ResizeObserver(entries => {
      const height = entries[0]?.contentRect.height ?? 0
      setContainerHeight(height)
    })

    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    return () => observer.disconnect()
  }, [])

  const y = useMotionValue(0)
  const totalHeight = extendedCards.length * itemHeight

  useEffect(() => {
    let animationFrame: number
    let lastTime = performance.now()
    const speed = 30

    function animateScroll(now: number) {
      const elapsed = (now - lastTime) / 1000
      lastTime = now
      let current = y.get()
      current -= speed * elapsed

      if (Math.abs(current) >= totalHeight / 3) {
        current += totalHeight / 3
      }
      y.set(current)
      animationFrame = requestAnimationFrame(animateScroll)
    }
    animationFrame = requestAnimationFrame(animateScroll)
    return () => cancelAnimationFrame(animationFrame)
  }, [y, totalHeight])

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      ref={containerRef}
      style={{
        maskImage: 'linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)'
      }}
    >
      <motion.div className="absolute left-1/2 flex w-full -translate-x-1/2 flex-col items-center" style={{ y }}>
        {extendedCards.map((card, index) => (
          <DeployCardMotion
            key={`${index}-${card.title}`}
            y={y}
            index={index}
            offset={offset}
            itemHeight={itemHeight}
            card={card}
          />
        ))}
      </motion.div>
    </div>
  )
}
