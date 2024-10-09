'use client'

import { useState, useEffect } from 'react'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, ArrowLeft, Plus } from 'lucide-react'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import Sidebar from '@/components/layout/Sidebar'

interface Category {
  mc_id: number
  mc_name: string
  img_id: string | null
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchCategories = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await fetch('http://localhost:5000/api/materialcategories')
        if (!response.ok) {
          throw new Error('Failed to fetch categories')
        }
        const data = await response.json()
        setCategories(data)
      } catch (error) {
        console.error('Error fetching categories:', error)
        setError('Failed to load categories. Please try again later.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchCategories()
  }, [])

  const filteredCategories = categories.filter(category => 
    category.mc_name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="flex flex-col min-h-screen bg-[#F3F0E9] text-[#3D3B54]">
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-4 md:ml-64 mt-16">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center">
              <Button variant="ghost" size="icon" className="mr-2">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-3xl font-bold">Categories</h1>
            </div>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500" />
                <Input
                  type="text"
                  placeholder="Search categories..."
                  className="pl-8 w-64"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button variant="outline">Show all</Button>
            </div>
          </div>

          {error ? (
            <div className="text-red-500 mb-4">{error}</div>
          ) : isLoading ? (
            <div className="text-center py-8">Loading categories...</div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {filteredCategories.map((category) => (
                <Link href={`/categories/${encodeURIComponent(category.mc_name)}`} key={category.mc_id}>
                  <div className="border border-[#3D3B54] rounded-lg p-4 hover:bg-white transition-colors">
                    <h3 className="font-semibold">{category.mc_name}</h3>
                  </div>
                </Link>
              ))}
              <Button 
                variant="outline" 
                className="h-full min-h-[100px] flex items-center justify-center border-dashed border-2"
              >
                <Plus className="mr-2" /> Add New Category
              </Button>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}