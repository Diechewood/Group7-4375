'use client'

import { useState, useEffect } from 'react'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Search, ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import Sidebar from '@/components/layout/Sidebar'
import CategoryCard from '@/components/CategoryCard'

interface Category {
  mc_id: number
  mc_name: string
  img_id: string | null
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [sortMethod, setSortMethod] = useState("alphabetical")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsLoading(true)
    fetch('http://localhost:5000/api/materialcategories')
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to fetch categories')
        }
        return response.json()
      })
      .then(data => {
        console.log('Received data:', data) // Add this line for debugging
        if (Array.isArray(data)) {
          setCategories(data)
        } else {
          throw new Error('Received data is not an array')
        }
        setIsLoading(false)
      })
      .catch(error => {
        console.error('Error fetching categories:', error)
        setError('Failed to load categories. Please try again later.')
        setIsLoading(false)
      })
  }, [])

  const filteredCategories = categories.filter(category => 
    category.mc_name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const sortedCategories = [...filteredCategories].sort((a, b) => {
    if (sortMethod === "alphabetical") {
      return a.mc_name.localeCompare(b.mc_name)
    } else if (sortMethod === "reverse") {
      return b.mc_name.localeCompare(a.mc_name)
    }
    return 0
  })

  const addNewCategory = () => {
    // Implement API call to add a new category
    console.log("Add new category functionality not implemented")
  }

  return (
    <div className="flex flex-col min-h-screen bg-purple-100 text-gray-800">
      <Header />
      <div className="flex flex-1">
        <Sidebar />
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

          {error ? (
            <div className="text-red-500 mb-4">{error}</div>
          ) : isLoading ? (
            <div className="text-center py-8">Loading categories...</div>
          ) : (
            <>
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
                {sortedCategories.map((category) => (
                  <CategoryCard key={category.mc_id} id={category.mc_id} name={category.mc_name} />
                ))}
                <Button 
                  variant="outline" 
                  className="h-full min-h-[100px] flex items-center justify-center text-gray-800 border-gray-400 hover:bg-purple-200"
                  onClick={addNewCategory}
                >
                  <Plus className="mr-2" /> Add New Category
                </Button>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  )
}