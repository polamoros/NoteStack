/**
 * Renders a label's icon (Lucide icon name) or falls back to a colored dot / default Tag icon.
 * Used in sidebar, NoteCard badges, and LabelSelector.
 */
import * as LucideIcons from 'lucide-react'
import { Tag } from 'lucide-react'
import type { LucideProps } from 'lucide-react'

interface LabelIconProps {
  icon: string | null | undefined
  color: string | null | undefined
  size?: number
  className?: string
}

export function LabelIcon({ icon, color, size = 14, className }: LabelIconProps) {
  if (icon) {
    // Try to render as a Lucide icon (PascalCase name e.g. "Star", "Home")
    const IconComponent = (LucideIcons as unknown as Record<string, React.ComponentType<LucideProps>>)[icon]
    if (IconComponent) {
      return (
        <IconComponent
          style={{ color: color ?? undefined, width: size, height: size }}
          className={className}
        />
      )
    }
    // Render as emoji / plain text character
    return (
      <span
        role="img"
        aria-label="icon"
        style={{ fontSize: size * 0.95, lineHeight: 1 }}
        className={`shrink-0 select-none ${className ?? ''}`}
      >
        {icon}
      </span>
    )
  }
  if (color) {
    // Colored dot
    return (
      <span
        className={`rounded-full shrink-0 ${className ?? ''}`}
        style={{ background: color, width: size, height: size, display: 'inline-block' }}
      />
    )
  }
  // Default tag icon
  return <Tag style={{ width: size, height: size }} className={className} />
}
