'use client'

import { useState, useEffect, useCallback, Fragment } from 'react'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, ArrowUpDown, AlertCircle, ChevronDown, ChevronRight, X, Check, Pencil, Trash2, Plus } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

interface MaterialMeasurement {
  meas_id: number
  meas_unit: string
}

interface MaterialCategory {
  mc_id: number
  meas_id: number
  mc_name: string
  img_id: string | null
}

interface MaterialBrand {
  brand_id: number
  mc_id: number
  brand_name: string
  brand_price: number
  img_id: string | null
}

interface Material {
  mat_id: number
  brand_id: number
  mat_name: string
  mat_sku: string
  mat_inv: number
  mat_alert: number
  img_id: string | null
  mc_id: number
  mc_name: string
  meas_id: number
  meas_unit: string
}

interface GroupedMaterials {
  [key: number]: Material[]
}

interface CategoryPageProps {
  category: string
  categoryId: number
  measurementId: number
  isPopup?: boolean
  onSelectMaterial?: (materialId: number) => void
}

interface NewBrandFormData {
  brand_name: string
  brand_price: string
  mc_id: number
}

interface NewMaterialFormData {
  mat_name: string
  mat_sku: string
  mat_inv: string
  mat_alert: string
  brand_id: number
}

export default function CategoryPage({ category, categoryId, measurementId, isPopup = false, onSelectMaterial }: CategoryPageProps) {
  const { toast } = useToast()
  const [materials, setMaterials] = useState<Material[]>([])
  const [brands, setBrands] = useState<MaterialBrand[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [retryCount, setRetryCount] = useState(0)
  const [expandedBrands, setExpandedBrands] = useState<Set<number>>(new Set())
  const [editingInventory, setEditingInventory] = useState<{ [key: number]: string }>({})
  const [isEditMode, setIsEditMode] = useState(false)
  const [editedMaterials, setEditedMaterials] = useState<{[key: number]: Material}>({})
  const [editedBrands, setEditedBrands] = useState<{[key: number]: MaterialBrand}>({})
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'brand' | 'material', id: number, name: string } | null>(null)
  const [isAddingBrand, setIsAddingBrand] = useState(false)
  const [isAddingMaterial, setIsAddingMaterial] = useState(false)
  const [selectedBrandId, setSelectedBrandId] = useState<number | null>(null)
  const [selectedMaterialId, setSelectedMaterialId] = useState<number | null>(null)
  const [newBrandData, setNewBrandData] = useState<NewBrandFormData>({
    brand_name: '',
    brand_price: '',
    mc_id: categoryId
  })
  const [newMaterialData, setNewMaterialData] = useState<NewMaterialFormData>({
    mat_name: '',
    mat_sku: '',
    mat_inv: '',
    mat_alert: '',
    brand_id: 0
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchData = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true)
    setError(null)
    try {
      // Fetch materials and brands for this specific category
      const [materialsRes, brandsRes] = await Promise.all([
        fetch(`http://localhost:5000/api/materials?category=${encodeURIComponent(category)}`, { signal }),
        fetch(`http://localhost:5000/api/materialbrands?mc_id=${categoryId}`, { signal })
      ])
      
      if (!materialsRes.ok || !brandsRes.ok) {
        throw new Error(`Failed to fetch data: Materials ${materialsRes.status}, Brands ${brandsRes.status}`)
      }

      const [materialsData, brandsData] = await Promise.all([
        materialsRes.json(),
        brandsRes.json()
      ])

      setMaterials(materialsData)
      setBrands(brandsData.filter((brand: MaterialBrand) => brand.mc_id === categoryId))
      setRetryCount(0)
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        console.log('Fetch aborted')
        return
      }
      console.error('Error fetching data:', error)
      setError('Failed to load materials. Retrying...')
      if (retryCount < 3) {
        setRetryCount(prevCount => prevCount + 1)
      } else {
        setError('Failed to load materials after multiple attempts. Please try again later.')
      }
    } finally {
      setIsLoading(false)
    }
  }, [category, categoryId, retryCount])

  useEffect(() => {
    const abortController = new AbortController()
    const signal = abortController.signal

    fetchData(signal)

    const retryTimer = retryCount > 0 && retryCount < 3 ? setTimeout(() => fetchData(signal), 1000) : null

    return () => {
      abortController.abort()
      if (retryTimer) clearTimeout(retryTimer)
    }
  }, [fetchData, retryCount])

  const filteredBrands = brands.filter(brand => 
    searchTerm === '' || 
    brand.brand_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    materials.some(m => 
      m.brand_id === brand.brand_id && (
        m.mat_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.mat_sku.toLowerCase().includes(searchTerm.toLowerCase())
      )
    )
  )

  const groupedMaterials = materials.reduce((acc: GroupedMaterials, material) => {
    if (!acc[material.brand_id]) {
      acc[material.brand_id] = []
    }
    acc[material.brand_id].push(material)
    return acc
  }, {})

  const sortedBrandIds = filteredBrands
    .sort((a, b) => {
      return sortDirection === 'asc' 
        ? a.brand_name.localeCompare(b.brand_name) 
        : b.brand_name.localeCompare(a.brand_name)
    })
    .map(brand => brand.brand_id)

  const toggleBrand = (brandId: number) => {
    setExpandedBrands(prev => {
      const next = new Set(prev)
      if (next.has(brandId)) {
        next.delete(brandId)
      } else {
        next.add(brandId)
      }
      return next
    })
  }

  const handleEditInventory = (materialId: number, currentInventory: number) => {
    setEditingInventory(prev => ({ ...prev, [materialId]: currentInventory.toString() }))
  }

  const handleCancelEdit = (materialId: number) => {
    setEditingInventory(prev => {
      const next = { ...prev }
      delete next[materialId]
      return next
    })
  }

  const handleUpdateInventory = async (materialId: number) => {
    const newInventory = parseFloat(editingInventory[materialId])
    if (isNaN(newInventory)) {
      toast({
        title: "Error",
        description: "Please enter a valid number for inventory.",
        variant: "destructive",
        className: "bg-red-500 text-black font-medium rounded-xl",
        duration: 2000,
      })
      return
    }

    if (isPopup && onSelectMaterial) {
      onSelectMaterial(materialId)
      return
    }

    try {
      const response = await fetch(`http://localhost:5000/api/materials/${materialId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mat_inv: newInventory }),
      })

      if (!response.ok) {
        throw new Error('Failed to update inventory')
      }

      setMaterials(prevMaterials =>
        prevMaterials.map(material =>
          material.mat_id === materialId ? { ...material, mat_inv: newInventory } : material
        )
      )

      handleCancelEdit(materialId)
      toast({
        title: "Success",
        description: "Inventory updated successfully",
        className: "bg-green-500 text-black font-medium rounded-xl",
        duration: 2000,
      })
    } catch (error) {
      console.error('Error updating inventory:', error)
      toast({
        title: "Error",
        description: "Failed to update inventory. Please try again.",
        variant: "destructive",
        className: "bg-red-500 text-black font-medium rounded-xl",
        duration: 2000,
      })
    }
  }

  const handleStartEdit = () => {
    setIsEditMode(true)
    const materialsMap = materials.reduce((acc, material) => {
      acc[material.mat_id] = { ...material }
      return acc
    }, {} as {[key: number]: Material})
    setEditedMaterials(materialsMap)

    const brandsMap = brands.reduce((acc, brand) => {
      acc[brand.brand_id] = { ...brand }
      return acc
    }, {} as {[key: number]: MaterialBrand})
    setEditedBrands(brandsMap)
  }

  const handleCancelEditMode = () => {
    setIsEditMode(false)
    setEditedMaterials({})
    setEditedBrands({})
  }

  const handleSaveEdit = async () => {
    setIsLoading(true)
    try {
      const updates = []

      // Prepare material updates
      for (const [materialId, material] of Object.entries(editedMaterials)) {
        if (materials.find(m => m.mat_id === parseInt(materialId))?.mat_name !== material.mat_name ||
            materials.find(m => m.mat_id === parseInt(materialId))?.mat_sku !== material.mat_sku ||
            materials.find(m => m.mat_id === parseInt(materialId))?.mat_alert !== material.mat_alert ||
            materials.find(m => m.mat_id === parseInt(materialId))?.mat_inv !== material.mat_inv) {
          updates.push(
            fetch(`http://localhost:5000/api/materials/${materialId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                mat_name: material.mat_name,
                mat_sku: material.mat_sku,
                mat_alert: material.mat_alert,
                mat_inv: material.mat_inv
              })
            })
          )
        }
      }

      // Prepare brand updates
      for (const [brandId, brand] of Object.entries(editedBrands)) {
        if (brands.find(b => b.brand_id === parseInt(brandId))?.brand_name !== brand.brand_name ||
            brands.find(b => b.brand_id === parseInt(brandId))?.brand_price !== brand.brand_price) {
          updates.push(
            fetch(`http://localhost:5000/api/materialbrands/${brandId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                brand_name: brand.brand_name,
                brand_price: brand.brand_price
              })
            })
          )
        }
      }

      // Execute all updates
      const results = await Promise.all(updates)

      // Check if all updates were successful
      if (results.every(res => res.ok)) {
        toast({
          title: "Success",
          description: "Changes saved successfully",
          className: "bg-green-500 text-black font-medium rounded-xl",
          duration: 2000,
        })
        setIsEditMode(false)
        setEditedMaterials({})
        setEditedBrands({})
        await fetchData()
      } else {
        throw new Error('Some updates failed')
      }
    } catch (error) {
      console.error('Error saving changes:', error)
      toast({
        title: "Error",
        description: "Failed to save changes. Please try again.",
        variant: "destructive",
        className: "bg-red-500 text-black font-medium rounded-xl",
        duration: 2000,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleMaterialEdit = (materialId: number, field: keyof Material, value: string | number) => {
    setEditedMaterials(prev => ({
      ...prev,
      [materialId]: {
        ...prev[materialId],
        [field]: value
      }
    }))
  }

  const handleBrandEdit = (brandId: number, field: keyof MaterialBrand, value: string | number) => {
    setEditedBrands(prev => ({
      ...prev,
      [brandId]: {
        ...prev[brandId],
        [field]: value
      }
    }))
  }

  const handleDelete = async () => {
    if (!deleteTarget) return

    try {
      const endpoint = deleteTarget.type === 'brand' 
        ? `http://localhost:5000/api/materialbrands/${deleteTarget.id}`
        : `http://localhost:5000/api/materials/${deleteTarget.id}`

      const response = await fetch(endpoint, { method: 'DELETE' })

      if (!response.ok) {
        throw new Error(`Failed to delete ${deleteTarget.type}`)
      }

      toast({
        title: "Success",
        description: `${deleteTarget.type.charAt(0).toUpperCase() + deleteTarget.type.slice(1)} deleted successfully`,
        className: "bg-green-500 text-black font-medium rounded-xl",
        duration: 2000,
      })

      // Refresh the data
      await fetchData()
    } catch (error) {
      console.error(`Error deleting ${deleteTarget.type}:`, error)
      toast({
        title: "Error",
        description: `Failed to delete ${deleteTarget.type}. Please try again.`,
        variant: "destructive",
        className: "bg-red-500 text-black font-medium rounded-xl",
        duration: 2000,
      })
    } finally {
      setDeleteTarget(null)
    }
  }

  const handleAddBrand = async () => {
    if (!newBrandData.brand_name || !newBrandData.brand_price) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
        className: "bg-red-500 text-black font-medium rounded-xl",
        duration: 2000,
      })
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch('http://localhost:5000/api/materialbrands', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            brand_name: newBrandData.brand_name,
            brand_price: parseFloat(newBrandData.brand_price),
            mc_id: categoryId,
            img_id: null
          }),
        })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to create brand')
      }

      toast({
        title: "Success",
        description: "Brand created successfully",
        className: "bg-green-500 text-black font-medium rounded-xl",
        duration: 2000,
      })

      setIsAddingBrand(false)
      setNewBrandData({
        brand_name: '',
        brand_price: '',
        mc_id: categoryId
      })
      await fetchData()
    } catch (error) {
      console.error('Error creating brand:', error)
      toast({
        title: "Error",
        description: (error as Error).message || "Failed to create brand. Please try again.",
        variant: "destructive",
        className: "bg-red-500 text-black font-medium rounded-xl",
        duration: 2000,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAddMaterial = async () => {
    if (!newMaterialData.mat_name || !newMaterialData.mat_sku || 
        !newMaterialData.mat_inv || !newMaterialData.mat_alert || !selectedBrandId) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
        className: "bg-red-500 text-black font-medium rounded-xl",
        duration: 2000,
      })
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch('http://localhost:5000/api/materials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mat_name: newMaterialData.mat_name,
          mat_sku: newMaterialData.mat_sku,
          mat_inv: parseFloat(newMaterialData.mat_inv),
          mat_alert: parseFloat(newMaterialData.mat_alert),
          brand_id: selectedBrandId,
          img_id: null
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create material')
      }

      toast({
        title: "Success",
        description: "Material created successfully",
        className: "bg-green-500 text-black font-medium rounded-xl",
        duration: 2000,
      })

      setIsAddingMaterial(false)
      setNewMaterialData({
        mat_name: '',
        mat_sku: '',
        mat_inv: '',
        mat_alert: '',
        brand_id: 0
      })
      setSelectedBrandId(null)
      await fetchData()
    } catch (error) {
      console.error('Error creating material:', error)
      toast({
        title: "Error",
        description: "Failed to create material. Please try again.",
        className: "bg-red-500 text-black font-medium rounded-xl",
        duration: 2000,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mt-2">{category}</h1>
        <div className="flex justify-between items-center space-x-2 mt-4">
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-600" />
              <Input
                type="text"
                placeholder="Search materials..."
                className="pl-8 w-64 border-gray-300 text-gray-800 placeholder-gray-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button 
              variant="outline"
              onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
              className="text-gray-800 border-gray-300"
            >
              A to Z
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
            {!isPopup && (
              <>
                {isEditMode ? (
                  <>
                    <Button 
                      variant="outline" 
                      onClick={handleSaveEdit}
                      className="text-green-600 border-green-600 hover:bg-green-50"
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Save
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={handleCancelEditMode}
                      className="text-red-600 border-red-600 hover:bg-red-50"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    <Button 
                      variant="outline" 
                      onClick={handleStartEdit}
                      className="text-gray-800 border-black"
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit Values
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setIsAddingBrand(true)}
                      className="bg-[#4A447C] text-white hover:bg-purple-700"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      New Brand
                    </Button>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-white"></div>
        </div>
      )}
      {error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : filteredBrands.length === 0 ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Brands Found</AlertTitle>
          <AlertDescription>There are no brands available for this category.</AlertDescription>
        </Alert>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-x-auto flex-1 border border-gray-300">
          <table className="w-full">
            <thead>
              <tr className="bg-[#4A447C] text-white">
                <th className="p-2 text-left font-semibold">Brand/Name</th>
                <th className="p-2 text-left font-semibold">#</th>
                <th className="p-2 text-left font-semibold">
                  Inv ({materials[0]?.meas_unit || 'units'})
                </th>
                {!isEditMode && !isPopup && (
                  <th className="p-2 text-left font-semibold">Quick Edit</th>
                )}
                <th className="p-2 text-left font-semibold">
                  Alert ({materials[0]?.meas_unit || 'units'})
                </th>
                <th className="p-2 text-left font-semibold">$</th>
                <th className="p-2 text-left font-semibold">
                  {isPopup ? 'Action' : 'Actions'}
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedBrandIds.map((brandId) => {
                const brand = brands.find(b => b.brand_id === brandId)
                const materialsForBrand = groupedMaterials[brandId] || []
                const isExpanded = expandedBrands.has(brandId)
                const editedBrand = editedBrands[brandId] || brand

                return (
                  <Fragment key={brandId}>
                    <tr 
                      className={`
                        border-b border-gray-300 
                        ${isExpanded ? 'bg-[#F3F0FF]' : 'bg-white'} 
                        cursor-pointer hover:bg-[#F3F0FF]
                      `}
                      onClick={() => toggleBrand(brandId)}
                    >
                      <td className="p-2">
                        <div className="flex items-center">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 mr-2 text-gray-600" />
                          ) : (
                            <ChevronRight className="h-4 w-4 mr-2 text-gray-600" />
                          )}
                          {isEditMode ? (
                            <Input
                              value={editedBrand?.brand_name || ''}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => handleBrandEdit(brandId, 'brand_name', e.target.value)}
                              className="w-full max-w-[200px] text-gray-800"
                            />
                          ) : (
                            <span className="font-medium text-gray-800">
                              {brand?.brand_name}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-2 text-gray-800" colSpan={isEditMode ? 3 : 4}></td>
                      <td className="p-2 font-medium text-gray-800">
                        {isEditMode ? (
                          <Input
                            type="number"
                            value={editedBrand?.brand_price || ''}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => handleBrandEdit(brandId, 'brand_price', parseFloat(e.target.value))}
                            className="w-full max-w-[100px] text-gray-800"
                          />
                        ) : (
                          brand && typeof brand.brand_price === 'number'
                            ? `$${brand.brand_price.toFixed(2)}`
                            : brand?.brand_price || ''
                        )}
                      </td>
                      {!isPopup && (
                        <td className="p-2 text-gray-800">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation()
                              setDeleteTarget({ type: 'brand', id: brandId, name: brand?.brand_name || '' })
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </td>
                      )}
                    </tr>
                    {isExpanded && (
                      <>
                        {!isPopup && (
                          <tr className="border-b border-gray-300 bg-white">
                            <td colSpan={7} className="p-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedBrandId(brandId)
                                  setIsAddingMaterial(true)
                                }}
                                className="bg-[#4A447C] text-white hover:bg-purple-700 ml-6"
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Add Material
                              </Button>
                            </td>
                          </tr>
                        )}
                        {materialsForBrand.length === 0 ? (
                          <tr className="border-b border-gray-300 bg-white">
                            <td colSpan={7} className="p-2 pl-8 text-gray-600 italic">
                              No materials found for this brand.
                            </td>
                          </tr>
                        ) : (
                          materialsForBrand.map((material, index) => {
                            const editedMaterial = editedMaterials[material.mat_id] || material
                            const isSelected = selectedMaterialId === material.mat_id
                            return (
                              <tr 
                                key={material.mat_id} 
                                className={`
                                  border-b border-gray-300 last:border-b-0
                                  ${index % 2 === 0 ? 'bg-white' : 'bg-[#F3F0FF]'}
                                  ${isSelected ? 'bg-[#4A447C]/10' : ''}
                                  ${isPopup ? 'cursor-pointer hover:bg-[#4A447C]/5' : ''}
                                `}
                                onClick={() => {
                                  if (isPopup && onSelectMaterial) {
                                    setSelectedMaterialId(material.mat_id)
                                    onSelectMaterial(material.mat_id)
                                  }
                                }}
                              >
                                <td className="p-2 pl-8 text-gray-800">
                                  {isEditMode ? (
                                    <Input
                                      value={editedMaterial.mat_name}
                                      onChange={(e) => handleMaterialEdit(material.mat_id, 'mat_name', e.target.value)}
                                      className="w-full max-w-[200px] text-gray-800"
                                    />
                                  ) : (
                                    material.mat_name
                                  )}
                                </td>
                                <td className="p-2 text-gray-800">
                                  {isEditMode ? (
                                    <Input
                                      value={editedMaterial.mat_sku}
                                      onChange={(e) => handleMaterialEdit(material.mat_id, 'mat_sku', e.target.value)}
                                      className="w-full max-w-[100px] text-gray-800"
                                    />
                                  ) : (
                                    material.mat_sku
                                  )}
                                </td>
                                <td className="p-2 text-gray-800">
                                  {isEditMode ? (
                                    <Input
                                      type="number"
                                      value={editedMaterials[material.mat_id]?.mat_inv || material.mat_inv}
                                      onChange={(e) => handleMaterialEdit(material.mat_id, 'mat_inv', parseFloat(e.target.value))}
                                      className="w-full max-w-[100px] text-gray-800"
                                    />
                                  ) : (
                                    material.mat_inv
                                  )}
                                </td>
                                {!isEditMode && !isPopup && (
                                  <td className="p-2 text-gray-800">
                                    {editingInventory[material.mat_id] !== undefined ? (
                                      <div className="flex items-center">
                                        <Input
                                          type="number"
                                          value={editingInventory[material.mat_id]}
                                          onChange={(e) => setEditingInventory(prev => ({ ...prev, [material.mat_id]: e.target.value }))}
                                          className="w-20 mr-2 text-gray-800"
                                        />
                                        <Button size="sm" variant="ghost" onClick={() => handleUpdateInventory(material.mat_id)}>
                                          <Check className="h-4 w-4 text-green-600" />
                                        </Button>
                                        <Button size="sm" variant="ghost" onClick={() => handleCancelEdit(material.mat_id)}>
                                          <X className="h-4 w-4 text-red-600" />
                                        </Button>
                                      </div>
                                    ) : (
                                      <Button size="sm" variant="ghost" className="border border-black hover:bg-gray-100 text-gray-800"
                                              onClick={() => handleEditInventory(material.mat_id, material.mat_inv)}>
                                        Edit
                                      </Button>
                                    )}
                                  </td>
                                )}
                                <td className="p-2 text-gray-800">
                                  {isEditMode ? (
                                    <Input
                                      type="number"
                                      value={editedMaterial.mat_alert}
                                      onChange={(e) => handleMaterialEdit(material.mat_id, 'mat_alert', parseFloat(e.target.value))}
                                      className="w-full max-w-[100px] text-gray-800"
                                    />
                                  ) : (
                                    material.mat_alert
                                  )}
                                </td>
                                <td className="p-2 text-gray-800"></td>
                                {isPopup ? (
                                  <td className="p-2">
                                    <Button 
                                      size="sm" 
                                      variant={isSelected ? "default" : "outline"}
                                      className={`
                                        ${isSelected 
                                          ? 'bg-[#4A447C] text-white' 
                                          : 'border-[#4A447C] text-[#4A447C] hover:bg-[#4A447C] hover:text-white'}
                                      `}
                                      onClick={() => {
                                        setSelectedMaterialId(material.mat_id)
                                        onSelectMaterial && onSelectMaterial(material.mat_id)
                                      }}
                                    >
                                      Select
                                    </Button>
                                  </td>
                                ) : (
                                  <td className="p-2 text-gray-800">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => setDeleteTarget({ type: 'material', id: material.mat_id, name: material.mat_name })}
                                    >
                                      <Trash2 className="h-4 w-4 text-red-600" />
                                    </Button>
                                  </td>
                                )}
                              </tr>
                            )
                          })
                        )}
                      </>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this {deleteTarget?.type}?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.type === 'brand' 
                ? "This action will delete the brand and all associated materials. This action cannot be undone."
                : "This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isAddingBrand} onOpenChange={setIsAddingBrand}>
        <DialogContent className="bg-white border border-[#4A447C]/20 p-6">
          <DialogHeader className="text-[#4A447C] text-xl font-semibold">
            <DialogTitle>Add New Brand</DialogTitle>
            <DialogDescription>
              Create a new brand for {category}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="brand_name" className="col-span-3 border-[#4A447C]/20 text-[#4A447C] focus:border-[#4A447C] focus:ring-[#4A447C]" >Brand Name</Label>
              <Input
                id="brand_name"
                value={newBrandData.brand_name}
                onChange={(e) => setNewBrandData(prev => ({ ...prev, brand_name: e.target.value }))}
                placeholder="Enter brand name"
                className="col-span-3 border-[#4A447C] text-black"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="brand_price" className="col-span-3 border-[#4A447C]/20 text-[#4A447C] focus:border-[#4A447C] focus:ring-[#4A447C]">Price</Label>
              <Input
                id="brand_price"
                type="number"
                step="0.01"
                value={newBrandData.brand_price}
                onChange={(e) => setNewBrandData(prev => ({ ...prev, brand_price: e.target.value }))}
                placeholder="Enter price"
                className="col-span-3 border-[#4A447C] text-black"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddingBrand(false)}
              disabled={isSubmitting}
              className="border-[#4A447C] text-black"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddBrand}
              disabled={isSubmitting}
              className="bg-[#4A447C]"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Creating...
                </>
              ) : (
                'Create Brand'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddingMaterial} onOpenChange={setIsAddingMaterial}>
        <DialogContent className="bg-white border-b-2 border-[#4A447C] p-6">
          <DialogHeader>
            <DialogTitle className="text-[#4A447C] text-xl font-semibold">Add New Material</DialogTitle>
            <DialogDescription>
              Create a new material for {brands.find(b => b.brand_id === selectedBrandId)?.brand_name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="mat_name" className="col-span-3 border-[#4A447C]/20 text-[#4A447C] focus:border-[#4A447C] focus:ring-[#4A447C]">Material Name</Label>
              <Input
                id="mat_name"
                value={newMaterialData.mat_name}
                onChange={(e) => setNewMaterialData(prev => ({ ...prev, mat_name: e.target.value }))}
                placeholder="Enter material name"
                className="col-span-3 border-[#4A447C] text-black"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="mat_sku" className="col-span-3 border-[#4A447C]/20 text-[#4A447C] focus:border-[#4A447C] focus:ring-[#4A447C]">SKU</Label>
              <Input
                id="mat_sku"
                value={newMaterialData.mat_sku}
                onChange={(e) => setNewMaterialData(prev => ({ ...prev, mat_sku: e.target.value }))}
                placeholder="Enter SKU"
                className="col-span-3 border-[#4A447C] text-black"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="mat_inv" className="col-span-3 border-[#4A447C]/20 text-[#4A447C] focus:border-[#4A447C] focus:ring-[#4A447C]">Initial Inventory</Label>
              <Input
                id="mat_inv"
                type="number"
                value={newMaterialData.mat_inv}
                onChange={(e) => setNewMaterialData(prev => ({ ...prev, mat_inv: e.target.value }))}
                placeholder="Enter initial inventory"
                className="col-span-3 border-[#4A447C] text-black"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="mat_alert" className="col-span-3 border-[#4A447C]/20 text-[#4A447C] focus:border-[#4A447C] focus:ring-[#4A447C]">Alert Threshold</Label>
              <Input
                id="mat_alert"
                type="number"
                value={newMaterialData.mat_alert}
                onChange={(e) => setNewMaterialData(prev => ({ ...prev, mat_alert: e.target.value }))}
                placeholder="Enter alert threshold"
                className="col-span-3 border-[#4A447C] text-black"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="border-[#4A447C] text-[#4A447C]"
              onClick={() => {
                setIsAddingMaterial(false)
                setSelectedBrandId(null)
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddMaterial}
              disabled={isSubmitting}
              className="bg-[#4A447C]"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Creating...
                </>
              ) : (
                'Create Material'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}