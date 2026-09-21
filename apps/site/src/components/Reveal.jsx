import { motion } from 'motion/react'

// Shared scroll-triggered entrance. Sections rise once, on first sight —
// re-animating on every scroll-back reads as noise, not craft.
function Reveal({ as = 'div', delay = 0, y = 28, className, children, ...rest }) {
  const Motion = motion[as] ?? motion.div

  return (
    <Motion
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.75, delay, ease: [0.16, 1, 0.3, 1] }}
      {...rest}
    >
      {children}
    </Motion>
  )
}

export default Reveal
