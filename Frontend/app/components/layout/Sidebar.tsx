import Link from 'next/link'
import { Home, Menu, Gem, ListTodo, Cake } from 'lucide-react'
import { Button } from "@/components/ui/button"

export default function Sidebar() {
  return (
    <aside className="w-64 bg-purple-200 p-4 fixed top-16 left-0 bottom-0 overflow-y-auto z-40">
      <nav>
        <ul className="space-y-2">
          <li>
            <Link href="/dashboard">
              <Button variant="ghost" className="w-full justify-start text-gray-800 hover:text-purple-700">
                <Home className="mr-2 h-5 w-5" />
                Dashboard
              </Button>
            </Link>
          </li>
          <li>
            <Link href="/products">
              <Button variant="ghost" className="w-full justify-start text-gray-800 hover:text-purple-700">
                <Menu className="mr-2 h-5 w-5" />
                Products
              </Button>
            </Link>
          </li>
          <li>
            <Link href="/materials">
              <Button variant="ghost" className="w-full justify-start text-gray-800 hover:text-purple-700">
                <Gem className="mr-2 h-5 w-5" />
                Materials
              </Button>
            </Link>
          </li>
          <li>
            <Link href="/todo">
              <Button variant="ghost" className="w-full justify-start text-gray-800 hover:text-purple-700">
                <ListTodo className="mr-2 h-5 w-5" />
                To-do List
              </Button>
            </Link>
          </li>
          <li>
            <Link href="/events">
              <Button variant="ghost" className="w-full justify-start text-gray-800 hover:text-purple-700">
                <Cake className="mr-2 h-5 w-5" />
                Events
              </Button>
            </Link>
          </li>
        </ul>
      </nav>
    </aside>
  )
}