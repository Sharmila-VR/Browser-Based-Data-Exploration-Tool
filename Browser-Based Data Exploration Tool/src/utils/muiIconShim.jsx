import React from 'react'

export function createSvgIcon(path, displayName) {
  const Component = React.forwardRef((props, ref) => {
    const { className, fontSize, sx, style, ...rest } = props
    return (
      <svg
        ref={ref}
        focusable="false"
        aria-hidden="true"
        viewBox="0 0 24 24"
        width="20"
        height="20"
        fill="currentColor"
        className={className}
        style={{ display: 'inline-block', verticalAlign: 'middle', userSelect: 'none', flexShrink: 0, ...style }}
        {...rest}
      >
        {path}
      </svg>
    )
  })
  Component.displayName = displayName
  return Component
}

export default createSvgIcon
