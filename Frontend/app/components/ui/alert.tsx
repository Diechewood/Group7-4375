import React from 'react'

interface AlertProps {
  variant?: 'default' | 'destructive'
  children: React.ReactNode
}

export function Alert({ variant = 'default', children }: AlertProps) {
  const baseStyles = "p-4 rounded-md mb-4"
  const variantStyles = {
    default: "bg-blue-100 text-blue-700",
    destructive: "bg-red-100 text-red-700"
  }

  return (
    <div className={`${baseStyles} ${variantStyles[variant]}`}>
      {children}
    </div>
  )
}

export function AlertTitle({ children }: { children: React.ReactNode }) {
  return <h5 className="font-medium mb-1">{children}</h5>
}

export function AlertDescription({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>
}