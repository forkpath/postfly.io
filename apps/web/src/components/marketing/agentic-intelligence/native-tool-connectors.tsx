import type React from 'react'

import { motion } from 'motion/react'

export const VerticalLine = (props: React.SVGProps<SVGSVGElement> & { stopColor?: string }) => {
  return (
    <svg
      width="1"
      height="81"
      viewBox="0 0 1 81"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
      {...props}
    >
      <line y1="-0.5" x2="80" y2="-0.5" transform="matrix(0 -1 -1 0 0 80.5)" stroke="var(--color-line)" />
      <line y1="-0.5" x2="80" y2="-0.5" transform="matrix(0 -1 -1 0 0 80.5)" stroke="url(#vertical-line-gradient)" />
      <defs>
        <motion.linearGradient
          id="vertical-line-gradient"
          initial={{
            x1: 0,
            x2: 2,
            y1: '0%',
            y2: '0%'
          }}
          animate={{
            x1: 0,
            x2: 2,
            y1: '80%',
            y2: '100%'
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            repeatType: 'loop',
            ease: 'easeInOut',
            repeatDelay: 1
          }}
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="var(--color-line)" />
          <stop offset="0.5" stopColor="#F17463" />
          <stop offset="1" stopColor="var(--color-line)" />
        </motion.linearGradient>
      </defs>
    </svg>
  )
}

export const RightSideSVG = (props: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg width="314" height="2" viewBox="0 0 314 2" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <line x1="0.5" y1="1" x2="313.5" y2="1" stroke="var(--color-line)" strokeLinecap="round" />
      <line x1="0.5" y1="1" x2="313.5" y2="1" stroke="url(#horizontal-line-gradient)" strokeLinecap="round" />
      <defs>
        <motion.linearGradient
          id="horizontal-line-gradient"
          initial={{
            y1: 0,
            y2: 1,
            x1: '-10%',
            x2: '0%'
          }}
          animate={{
            y1: 0,
            y2: 1,
            x1: '110%',
            x2: '120%'
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatType: 'loop',
            ease: 'easeInOut',
            repeatDelay: 1
          }}
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="var(--color-line)" />
          <stop offset="0.5" stopColor="var(--color-blue-500)" />
          <stop offset="1" stopColor="var(--color-line)" />
        </motion.linearGradient>
      </defs>
    </svg>
  )
}

export const TopSVG = (props: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg width="312" height="33" viewBox="0 0 312 33" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <line x1="0.5" y1="1" x2="311.5" y2="1" stroke="var(--color-line)" strokeLinecap="round" />
      <line x1="311.5" y1="1" x2="311.5" y2="32" stroke="var(--color-line)" strokeLinecap="round" />

      <line x1="0.5" y1="1" x2="311.5" y2="1" stroke="url(#line-one-gradient)" strokeLinecap="round" />
      <defs>
        <motion.linearGradient
          gradientUnits="userSpaceOnUse"
          id="line-one-gradient"
          initial={{
            x1: '-20%',
            x2: '0%',
            y1: 1,
            y2: 0
          }}
          animate={{
            x1: '105%',
            x2: '120%',
            y1: 1,
            y2: 0
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatType: 'loop',
            ease: 'easeInOut',
            repeatDelay: 1
          }}
        >
          <stop stopColor="var(--color-line)" />
          <stop offset="0.33" stopColor="#F17463" />
          <stop offset="0.66" stopColor="#F17463" />
          <stop offset="1" stopColor="var(--color-line)" />
        </motion.linearGradient>
      </defs>
    </svg>
  )
}

export const MiddleSVG = (props: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg width="323" height="2" viewBox="0 0 323 2" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <line x1="0.5" y1="1" x2="322.5" y2="1" stroke="var(--color-line)" strokeLinecap="round" />
      <line x1="0.5" y1="1" x2="322.5" y2="1" stroke="url(#line-two-gradient)" strokeLinecap="round" />
      <defs>
        <motion.linearGradient
          gradientUnits="userSpaceOnUse"
          id="line-two-gradient"
          initial={{
            x1: '-20%',
            x2: '0%',
            y1: 1,
            y2: 0
          }}
          animate={{
            x1: '105%',
            x2: '120%',
            y1: 1,
            y2: 0
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatType: 'loop',
            ease: 'easeInOut',
            repeatDelay: 1
          }}
        >
          <stop stopColor="var(--color-line)" />
          <stop offset="0.33" stopColor="var(--color-blue-500)" />
          <stop offset="0.66" stopColor="var(--color-blue-500)" />
          <stop offset="1" stopColor="var(--color-line)" />
        </motion.linearGradient>
      </defs>
    </svg>
  )
}

export const BottomSVG = (props: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg width="326" height="32" viewBox="0 0 326 32" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <line y1="31" x2="325" y2="31" stroke="var(--color-line)" />

      <line x1="325.5" y1="31" x2="325.5" y2="1" stroke="var(--color-line)" strokeLinecap="round" />
      <line y1="31" x2="325" y2="31" stroke="url(#line-three-gradient)" />

      <defs>
        <motion.linearGradient
          id="line-three-gradient"
          gradientUnits="userSpaceOnUse"
          initial={{
            x1: '-20%',
            x2: '0%',
            y1: 1,
            y2: 0
          }}
          animate={{
            x1: '105%',
            x2: '120%'
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatType: 'loop',
            ease: 'easeInOut',
            repeatDelay: 1
          }}
        >
          <stop stopColor="var(--color-line)" />
          <stop offset="0.33" stopColor="var(--color-yellow-500)" />
          <stop offset="0.66" stopColor="var(--color-yellow-500)" />
          <stop offset="1" stopColor="var(--color-line)" />
        </motion.linearGradient>
      </defs>
    </svg>
  )
}
