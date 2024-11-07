'use client'

import { useState, useEffect } from 'react'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Plus } from 'lucide-react'
import Link from 'next/link'
import { Card, CardHeader, CardTitle } from "@/components/ui/card"

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

  useEffect(() => {
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

    fetchCategories()
  }, [])

  const filteredCategories = categories.filter(category => 
    category.pc_name.toLowerCase().includes(searchTerm.toLowerCase())
  )

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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredCategories.map((category) => (
            <Link href={`/products/${encodeURIComponent(category.pc_name)}`} key={category.pc_id}>
              <Card className="hover:bg-gray-50 transition-colors cursor-pointer">
                <CardHeader>
                  <CardTitle className="text-lg">{category.pc_name}</CardTitle>
                </CardHeader>
              </Card>
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
    </div>
  )
}