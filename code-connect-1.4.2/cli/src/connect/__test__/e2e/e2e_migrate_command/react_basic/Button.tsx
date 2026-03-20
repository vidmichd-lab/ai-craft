import React from 'react'

export interface ButtonProps {
  label: string
  variant?: 'primary' | 'secondary'
  disabled?: boolean
}

export const Button: React.FC<ButtonProps> = ({ label, variant = 'primary', disabled = false }) => {
  return (
    <button className={`button button--${variant}`} disabled={disabled}>
      {label}
    </button>
  )
}
