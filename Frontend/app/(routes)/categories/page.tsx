'use client'

import { useState, useEffect } from 'react'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Plus } from 'lucide-react'
import Link from 'next/link'
import CategoryCard from '@/components/CategoryCard'
import { useToast } from "@/hooks/use-toast"

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
  const [newCategoryName, setNewCategoryName] = useState("")
  const [isAddingCategory, setIsAddingCategory] = useState(false)
  const { toast } = useToast()

  const fetchCategories = async (retries = 3) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('http://localhost:5000/api/materialcategories')
      if (!response.ok) {
        throw new Error(`Failed to fetch categories: ${response.status} ${response.statusText}`)
      }
      const data = await response.json()
      setCategories(data)
    } catch (error) {
      console.error('Error fetching categories:', error)
      if (retries > 0) {
        console.log(`Retrying... (${retries} attempts left)`)
        setTimeout(() => fetchCategories(retries - 1), 1000)
      } else {
        setError('Failed to load categories. Please try again later.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchCategories()
  }, [])

  const filteredCategories = categories.filter(category => 
    category.mc_name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      toast({
        title: "Error",
        description: "Category name cannot be empty",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch('http://localhost:5000/api/materialcategories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mc_name: newCategoryName,
          meas_id: null, // Assuming meas_id is not required or can be null
          img_id: null
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to add category')
      }

      toast({
        title: "Success",
        description: "Category added successfully",
      })

      // Refresh categories
      await fetchCategories()

      setNewCategoryName("")
      setIsAddingCategory(false)
    } catch (error) {
      console.error('Error adding category:', error)
      toast({
        title: "Error",
        description: "Failed to add category. Please try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="h-full p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-[#3D3B54]">Material Categories</h1>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredCategories.map((category) => (
            <CategoryCard key={category.mc_id} id={category.mc_id} name={category.mc_name} />
          ))}
          {isAddingCategory ? (
            <div className="flex flex-col items-center justify-center p-4 border rounded-lg bg-white">
              <Input
                type="text"
                placeholder="New category name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="mb-2 text-gray-800"
              />
              <div className="flex space-x-2">
                <Button onClick={handleAddCategory} className="bg-[#464B95] hover:bg-[#363875] text-white">
                  Add
                </Button>
                <Button onClick={() => setIsAddingCategory(false)} variant="outline" className="text-gray-800">
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button 
              onClick={() => setIsAddingCategory(true)}
              variant="outline" 
              className="h-full min-h-[100px] flex items-center justify-center border-dashed border-2 bg-[#464B95] hover:bg-[#363875] text-white"
            >
              <Plus className="mr-2" /> Add New Category
            </Button>
          )}
        </div>
      )}
    </div>
  )
}