'use client'

import { useState, useEffect } from 'react'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Plus, X } from 'lucide-react'
import Link from 'next/link'
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface Category {
  pc_id: number
  pc_name: string
  img_id: string | null
}

export default function ProductsPage() {
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
      const response = await fetch('http://localhost:5000/api/productcategories')
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
    category.pc_name.toLowerCase().includes(searchTerm.toLowerCase())
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
      const response = await fetch('http://localhost:5000/api/productcategories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pc_name: newCategoryName,
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

      await fetchCategories()
      handleCloseDialog()
    } catch (error) {
      console.error('Error adding category:', error)
      toast({
        title: "Error",
        description: "Failed to add category. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleCloseDialog = () => {
    setIsAddingCategory(false)
    setNewCategoryName("")
  }

  return (
    <div className="h-full p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-[#3D3B54]">Product Categories</h1>
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
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredCategories.map((category) => (
            <Link href={`/products/${encodeURIComponent(category.pc_name)}`} key={category.pc_id}>
              <Card className="hover:bg-gray-50 transition-colors cursor-pointer h-24 flex items-center justify-center">
                <CardHeader className="p-3">
                  <CardTitle className="text-sm text-center">{category.pc_name}</CardTitle>
                </CardHeader>
              </Card>
            </Link>
          ))}
          <Button 
            onClick={() => setIsAddingCategory(true)}
            variant="outline" 
            className="h-24 flex items-center justify-center border-dashed border-2 bg-[#464B95] hover:bg-[#363875] text-white"
          >
            <Plus className="mr-2 h-4 w-4" /> <span className="text-xs">Add New</span>
          </Button>
        </div>
      )}

      <Dialog open={isAddingCategory} onOpenChange={handleCloseDialog}>
        <DialogContent className="sm:max-w-[425px] text-white">
          <DialogHeader>
            <DialogTitle>Add New Category</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Input
                type="text"
                placeholder="Category name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="text-white placeholder-gray-400 bg-transparent border-gray-600"
              />
            </div>
            <Button onClick={handleAddCategory} className="bg-[#464B95] hover:bg-[#363875] text-white w-full">
              Add Category
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}