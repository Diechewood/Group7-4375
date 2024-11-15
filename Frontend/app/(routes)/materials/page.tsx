'use client'

import { useState, useEffect } from 'react'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Plus, Trash2, ArrowLeft } from 'lucide-react'
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import CategoryPage from './[category]/page'

interface Category {
  mc_id: number
  mc_name: string
  img_id: string | null
  meas_id: number
}

const measurementUnits = [
  { meas_id: 1, label: 'Grams', value: '1' },
  { meas_id: 2, label: 'Pieces', value: '2' },
  { meas_id: 3, label: 'Inches', value: '3' },
  { meas_id: 4, label: 'Feet', value: '4' },
  { meas_id: 5, label: 'Yards', value: '5' },
  { meas_id: 6, label: 'Ounces', value: '6' },
  { meas_id: 7, label: 'Pounds', value: '7' },
]

interface CategoriesPageProps {
  isPopup?: boolean
  onSelectMaterial?: (materialId: number) => void
}

export default function CategoriesPage({ isPopup = false, onSelectMaterial }: CategoriesPageProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [isAddingCategory, setIsAddingCategory] = useState(false)
  const [isDeletingCategory, setIsDeletingCategory] = useState(false)
  const [selectedMeasurement, setSelectedMeasurement] = useState<string>("")
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [selectedCategoriesToDelete, setSelectedCategoriesToDelete] = useState<Set<number>>(new Set())
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
        className: "bg-red-500 text-black font-medium rounded-xl",
        duration: 2000,
      })
      return
    }

    if (!selectedMeasurement) {
      toast({
        title: "Error",
        description: "Please select a measurement unit",
        className: "bg-red-500 text-black font-medium rounded-xl",
        duration: 2000,
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
          meas_id: parseInt(selectedMeasurement),
          img_id: null
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to add category')
      }

      toast({
        title: "Success",
        description: "Category added successfully",
        className: "bg-green-500 text-black font-medium rounded-xl",
        duration: 2000,
      })

      await fetchCategories()
      handleCloseDialog()
    } catch (error) {
      console.error('Error adding category:', error)
      toast({
        title: "Error",
        description: "Failed to add category. Please try again.",
        className: "bg-red-500 text-black font-medium rounded-xl",
        duration: 2000,
      })
    }
  }

  const handleCloseDialog = () => {
    setIsAddingCategory(false)
    setNewCategoryName("")
    setSelectedMeasurement("")
  }

  const handleCategoryClick = (category: Category) => {
    setSelectedCategory(category)
  }

  const handleBackToCategories = () => {
    setSelectedCategory(null)
  }

  const handleDeleteCategories = async () => {
    if (selectedCategoriesToDelete.size === 0) return;

    try {
      for (const categoryId of selectedCategoriesToDelete) {
        const response = await fetch(`http://localhost:5000/api/materialcategories/${categoryId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error(`Failed to delete category with ID ${categoryId}`);
        }
      }

      toast({
        title: "Success",
        description: `${selectedCategoriesToDelete.size} ${selectedCategoriesToDelete.size === 1 ? 'category' : 'categories'} deleted successfully`,
        className: "bg-green-500 text-black font-medium rounded-xl",
        duration: 2000,
      });

      await fetchCategories();
      setIsDeletingCategory(false);
      setSelectedCategoriesToDelete(new Set());
    } catch (error) {
      console.error('Error deleting categories:', error);
      toast({
        title: "Error",
        description: "Failed to delete categories. Please try again.",
        className: "bg-red-500 text-black font-medium rounded-xl",
        duration: 2000,
      });
    }
  };

  const toggleCategorySelection = (categoryId: number) => {
    setSelectedCategoriesToDelete(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const renderCategoryButtons = () => {
    const totalSlots = 24 // 3x8 grid
    const filledSlots = filteredCategories.length
    const emptySlots = Math.max(totalSlots - filledSlots, 1) // Always have at least one empty slot

    return (
      <>
        {filteredCategories.map((category) => (
          <Button
            key={category.mc_id}
            variant="outline"
            className="h-32 border-2 border-[#4A447C] rounded-md hover:bg-[#4A447C] hover:text-white transition-colors flex items-center justify-center text-xl font-medium text-[#4A447C]"
            onClick={() => handleCategoryClick(category)}
          >
            {category.mc_name}
          </Button>
        ))}
        {Array.from({ length: emptySlots }).map((_, index) => (
          <Button
            key={`empty-${index}`}
            variant="outline"
            className="h-32 border-2 border-dashed border-[#4A447C] text-[#4A447C] hover:bg-[#4A447C] hover:text-white transition-colors"
            onClick={() => setIsAddingCategory(true)}
          >
            <Plus className="h-8 w-8" />
          </Button>
        ))}
      </>
    )
  }

  return (
    <div className="min-h-screen p-6">
      {selectedCategory ? (
        <div>
          <Button 
            variant="ghost" 
            onClick={handleBackToCategories}
            className="mb-4 text-[#4A447C] hover:bg-[#4A447C]/10"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Categories
          </Button>
          <CategoryPage 
            category={selectedCategory.mc_name}
            categoryId={selectedCategory.mc_id}
            measurementId={selectedCategory.meas_id}
            isPopup={isPopup} 
            onSelectMaterial={onSelectMaterial}
          />
        </div>
      ) : (
        <>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <h1 className="text-4xl font-bold text-[#4A447C]">Material Categories</h1>
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#4A447C] h-5 w-5" />
                <Input
                  type="text"
                  placeholder="Search categories..."
                  className="pl-10 w-full md:w-80 h-12 text-lg border-2 border-[#4A447C] text-[#4A447C] placeholder:text-[#4A447C]/60"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button 
                onClick={() => {
                  if (categories.length > 0) {
                    setIsDeletingCategory(true)
                    setSelectedCategoriesToDelete(new Set())
                  } else {
                    toast({
                      title: "Error",
                      description: "No categories to delete",
                      className: "bg-red-500 text-black font-medium rounded-xl",
                      duration: 2000,
                    })
                  }
                }}
                className="h-12 px-6 text-lg font-medium bg-red-600 hover:bg-red-700 text-white"
              >
                <Trash2 className="h-5 w-5 mr-2" />
                Delete Category
              </Button>
            </div>
          </div>

          {error ? (
            <div className="text-red-500 mb-4 text-lg">{error}</div>
          ) : isLoading ? (
            <div className="text-center py-8 text-lg">Loading categories...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {renderCategoryButtons()}
            </div>
          )}

          <Dialog open={isAddingCategory} onOpenChange={handleCloseDialog}>
            <DialogContent className="sm:max-w-[425px] bg-white">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-[#4A447C]">Add New Category</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <Input
                  type="text"
                  placeholder="Category name"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="text-lg h-12 border-2 border-[#4A447C] text-[#4A447C] placeholder:text-[#4A447C]/60"
                />
                <Select value={selectedMeasurement} onValueChange={setSelectedMeasurement}>
                  <SelectTrigger className="h-12 border-2 border-[#4A447C] text-[#4A447C]">
                    <SelectValue placeholder="Select measurement unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {measurementUnits.map((unit) => (
                      <SelectItem key={unit.meas_id} value={unit.value}>
                        {unit.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  onClick={handleAddCategory} 
                  className="w-full h-12 text-lg font-medium bg-[#4A447C] hover:bg-[#363875] text-white"
                >
                  Add Category
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isDeletingCategory} onOpenChange={(open) => {
            setIsDeletingCategory(open);
            if (!open) setSelectedCategoriesToDelete(new Set());
          }}>
            <DialogContent className="sm:max-w-[425px] bg-white">
              <DialogHeader className="space-y-4">
                <DialogTitle className="text-2xl font-bold text-[#4A447C]">Select Categories to Delete</DialogTitle>
                <div className="text-sm font-medium text-red-600 bg-red-50 p-4 rounded-md border border-red-200">
                  Warning: This action cannot be undone. This will permanently delete the selected categories
                  and all associated brands and materials.
                </div>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="max-h-[40vh] overflow-y-auto space-y-2">
                  {categories.map((category: Category) => (
                    <Button
                      key={category.mc_id}
                      variant="outline"
                      className={`justify-start h-12 text-lg w-full border-2 ${
                        selectedCategoriesToDelete.has(category.mc_id)
                          ? 'border-red-600 bg-red-50 text-red-600' 
                          : 'border-[#4A447C] text-[#4A447C] '
                      } hover:bg-[#4A447C] hover:text-white`}
                      onClick={(e) => {
                        e.preventDefault();
                        toggleCategorySelection(category.mc_id);
                      }}
                    >
                      {category.mc_name}
                    </Button>
                  ))}
                </div>
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsDeletingCategory(false)
                    setSelectedCategoriesToDelete(new Set())
                  }}
                  className="h-12 px-6 text-lg border-2 border-[#4A447C] text-[#4A447C] hover:bg-[#4A447C] hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  disabled={selectedCategoriesToDelete.size === 0}
                  onClick={handleDeleteCategories}
                  className="h-12 px-6 text-lg bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
                >
                  Delete {selectedCategoriesToDelete.size > 0 ? `(${selectedCategoriesToDelete.size})` : ''} Categories
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
      <Toaster />
    </div>
  )
}