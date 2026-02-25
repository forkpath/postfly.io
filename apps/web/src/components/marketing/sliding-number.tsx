import { useEffect, useId } from 'react'

import { motion, MotionValue, useSpring, useTransform } from 'motion/react'
import useMeasure from 'react-use-measure'

const TRANSITION = { stiffness: 280, damping: 18, mass: 0.3 }

function Digit({ value, place }: { value: number; place: number }) {
  const valueRoundedToPlace = Math.floor(value / place) % 10
  const animatedValue = useSpring(valueRoundedToPlace, TRANSITION)
  useEffect(() => {
    animatedValue.set(valueRoundedToPlace)
  }, [animatedValue, valueRoundedToPlace])
  return (
    <div className="relative inline-block w-[1ch] overflow-x-visible overflow-y-clip leading-none tabular-nums">
      <div className="invisible">0</div>
      {Array.from({ length: 10 }, (_, i) => (
        <NumberItem key={i} mv={animatedValue} number={i} />
      ))}
    </div>
  )
}

function NumberItem({ mv, number }: { mv: MotionValue<number>; number: number }) {
  const uniqueId = useId()
  const [ref, bounds] = useMeasure()
  const y = useTransform(mv, latest => {
    if (!bounds.height) return 0
    const placeValue = latest % 10
    const offset = (10 + number - placeValue) % 10
    let memo = offset * bounds.height
    if (offset > 5) memo -= 10 * bounds.height
    return memo
  })
  if (!bounds.height)
    return (
      <span ref={ref} className="invisible absolute">
        {number}
      </span>
    )
  return (
    <motion.span
      style={{ y }}
      layoutId={`${uniqueId}-${number}`}
      className="absolute inset-0 flex items-center justify-center"
      transition={{
        type: 'spring',
        stiffness: 280,
        damping: 18,
        mass: 0.3
      }}
      ref={ref}
    >
      {number}
    </motion.span>
  )
}

/* 数字滑动动画 */
export function SlidingNumber({
  value,
  padStart = false,
  decimalSeparator = '.'
}: {
  value: number
  padStart?: boolean
  decimalSeparator?: string
}) {
  const absValue = Math.abs(value)
  const [intPart, decPart] = absValue.toString().split('.')
  const intValue = parseInt(intPart, 10)
  const paddedInt = padStart && intValue < 10 ? `0${intPart}` : intPart
  const intDigits = paddedInt.split('')
  const intPlaces = intDigits.map((_, i) => Math.pow(10, intDigits.length - i - 1))

  return (
    <div className="flex items-center">
      {value < 0 && '-'}
      {intDigits.map((_, i) => (
        <Digit key={`pos-${intPlaces[i]}`} value={intValue} place={intPlaces[i]} />
      ))}
      {decPart && (
        <>
          <span>{decimalSeparator}</span>
          {decPart.split('').map((_, i) => (
            <Digit key={`dec-${i}`} value={parseInt(decPart, 10)} place={Math.pow(10, decPart.length - i - 1)} />
          ))}
        </>
      )}
    </div>
  )
}
