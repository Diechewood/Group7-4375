'use client'

import { useState } from 'react'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Bell, Star, HelpCircle, Menu, Plus, Search, ChevronLeft, Home, ListTodo, Gem, Cake } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

const initialCategories = [
  "Crochet", "Crochet Dragon", "Bracelets", "Necklaces", "B. Bracelets", 
  "B. keychains", "Acrylic keychains", "Stickers", "Pins"
]

export function CategoriesPage() {
  const [categories, setCategories] = useState(initialCategories)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortMethod, setSortMethod] = useState("alphabetical")

  const filteredCategories = categories.filter(category => 
    category.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const sortedCategories = [...filteredCategories].sort((a, b) => {
    if (sortMethod === "alphabetical") {
      return a.localeCompare(b)
    } else if (sortMethod === "reverse") {
      return b.localeCompare(a)
    }
    return 0
  })

  const addNewCategory = () => {
    const newCategory = `New Category ${categories.length + 1}`
    setCategories([...categories, newCategory])
  }

  return (
    <div className="flex flex-col min-h-screen bg-purple-100 text-gray-800">
      {/* Top Navbar */}
      <header className="bg-[#4A4A7C] text-white p-4 flex justify-between items-center z-10">
        <div className="flex items-center">
          <Button variant="ghost" size="icon" className="mr-2 md:hidden text-white hover:text-purple-200">
            <Menu />
          </Button>
          <Link href="/dashboard" className="flex items-center">
            <Image src="/placeholder.svg" alt="Frosted Fabrics Logo" width={32} height={32} className="mr-2" />
            <h1 className="text-xl font-bold text-white">Frosted Fabrics</h1>
          </Link>
        </div>
        <div className="flex space-x-2">
          <Button variant="ghost" size="icon" className="text-white hover:text-purple-200"><Bell /></Button>
          <Button variant="ghost" size="icon" className="text-white hover:text-purple-200"><Star /></Button>
          <Button variant="ghost" size="icon" className="text-white hover:text-purple-200"><HelpCircle /></Button>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
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

        {/* Main content */}
        <main className="flex-1 p-4 md:ml-64 mt-16">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center">
              <Button variant="ghost" size="icon" className="mr-2 text-gray-800 hover:text-purple-700">
                <ChevronLeft />
              </Button>
              <h2 className="text-2xl font-bold text-gray-800">Categories</h2>
            </div>
            <Button variant="outline" className="text-gray-800 border-gray-800 hover:bg-purple-200">Show all</Button>
          </div>

          <div className="flex justify-between items-center mb-4">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500" />
              <Input
                type="text"
                placeholder="Search categories..."
                className="pl-8 text-gray-800 placeholder-gray-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-gray-800">Sort by:</span>
              <Select value={sortMethod} onValueChange={setSortMethod}>
                <SelectTrigger className="w-[180px] text-gray-800 border-gray-400">
                  <SelectValue placeholder="Sort method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alphabetical">Alphabetical</SelectItem>
                  <SelectItem value="reverse">Reverse Alphabetical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {sortedCategories.map((category, index) => (
              <Link href={`/category/${encodeURIComponent(category)}`} key={index}>
                <Card className="hover:shadow-md transition-shadow bg-white">
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-gray-800">{category}</h3>
                  </CardContent>
                </Card>
              </Link>
            ))}
            <Button 
              variant="outline" 
              className="h-full min-h-[100px] flex items-center justify-center text-gray-800 border-gray-400 hover:bg-purple-200"
              onClick={addNewCategory}
            >
              <Plus className="mr-2" /> Add New Category
            </Button>
          </div>
        </main>
      </div>
    </div>
  )
}