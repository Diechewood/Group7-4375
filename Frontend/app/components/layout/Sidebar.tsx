import { Home, Menu, Gem, ListTodo, Cake } from 'lucide-react'
import { Button } from "@/components/ui/button"

export default function Sidebar() {
  return (
    <aside className="w-64 bg-purple-200 p-4 hidden md:block h-[calc(100vh-4rem)] fixed top-16 left-0 overflow-y-auto">
      <nav>
        <ul className="space-y-2">
          <li><Button variant="ghost" className="w-full justify-start text-gray-800 hover:text-purple-700"><Home className="mr-2" />Dashboard</Button></li>
          <li><Button variant="ghost" className="w-full justify-start text-gray-800 hover:text-purple-700"><Menu className="mr-2" />Products</Button></li>
          <li><Button variant="ghost" className="w-full justify-start text-gray-800 hover:text-purple-700"><Gem className="mr-2" />Materials</Button></li>
          <li><Button variant="ghost" className="w-full justify-start text-gray-800 hover:text-purple-700"><ListTodo className="mr-2" />To-do List</Button></li>
          <li><Button variant="ghost" className="w-full justify-start text-gray-800 hover:text-purple-700"><Cake className="mr-2" />Events</Button></li>
        </ul>
      </nav>
    </aside>
  )
}