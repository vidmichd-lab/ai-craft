import React from 'react'

export interface AvatarProps {
  name: string
  size?: 'small' | 'medium' | 'large'
}

export const Avatar: React.FC<AvatarProps> = ({ name, size = 'medium' }) => {
  return <div className={`avatar avatar--${size}`}>{name.charAt(0)}</div>
}
