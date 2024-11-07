'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Menu, Gem, ListTodo, Cake } from 'lucide-react'
import { Button } from "@/components/ui/button"

const navItems = [
  { href: '/dashboard', icon: Home, label: 'Dashboard' },
  { href: '/products', icon: Menu, label: 'Products' },
  { href: '/materials', icon: Gem, label: 'Materials' },
  { href: '/todo', icon: ListTodo, label: 'To-do List' },
  { href: '/events', icon: Cake, label: 'Events' },
]

export default function Sidebar() {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === href
    }
    return pathname.startsWith(href)
  }

  return (
    <aside className="w-64 bg-purple-200 p-4 fixed top-16 left-0 bottom-0 overflow-y-auto z-40">
      <nav>
        <ul className="space-y-2">
          {navItems.map((item) => {
            const active = isActive(item.href)
            return (
              <li key={item.href}>
                <Link href={item.href} passHref legacyBehavior>
                  <Button
                    variant="ghost"
                    className={`w-full justify-start ${
                      active
                        ? 'bg-purple-300 text-purple-700'
                        : 'text-gray-800 hover:text-purple-700'
                    }`}
                    onClick={(e) => {
                      if (active) {
                        e.preventDefault()
                        window.location.href = item.href
                      }
                    }}
                  >
                    <item.icon className="mr-2 h-5 w-5" />
                    {item.label}
                  </Button>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </aside>
  )
}