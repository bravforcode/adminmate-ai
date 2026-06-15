import * as React from 'react'

interface SlotProps extends React.HTMLAttributes<HTMLElement> {
  children?: React.ReactNode
}

const Slot = React.forwardRef<HTMLElement, SlotProps>((props, forwardedRef) => {
  const { children, ...slotProps } = props
  if (React.isValidElement(children)) {
    return React.cloneElement(children, {
      ...mergeProps(slotProps, children.props as Record<string, unknown>),
      ref: forwardedRef,
    } as React.Attributes)
  }
  return null
})
Slot.displayName = 'Slot'

function mergeProps(slotProps: Record<string, unknown>, childProps: Record<string, unknown>) {
  const merged: Record<string, unknown> = { ...childProps }
  for (const key in slotProps) {
    if (key === 'className') {
      merged.className = [slotProps.className, childProps.className].filter(Boolean).join(' ')
    } else if (key.startsWith('on')) {
      const slotHandler = slotProps[key] as React.EventHandler<React.SyntheticEvent> | undefined
      const childHandler = childProps[key] as React.EventHandler<React.SyntheticEvent> | undefined
      if (slotHandler && childHandler) {
        merged[key] = (e: React.SyntheticEvent) => {
          childHandler(e)
          slotHandler(e)
        }
      } else if (slotHandler) {
        merged[key] = slotHandler
      }
    } else {
      merged[key] = slotProps[key]
    }
  }
  return merged
}

export { Slot }
export type { SlotProps }
