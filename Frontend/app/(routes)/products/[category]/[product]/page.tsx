'use client'

import { useState, useEffect, Fragment, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Check, X, Plus, ChevronDown, ChevronRight, Pencil, Trash2, AlertTriangle } from 'lucide-react'
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { motion } from "framer-motion"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import CategoriesPage from '../../../materials/page'

interface Material {
  mat_id: number
  mat_name: string
  brand_name: string
  mc_name: string
  meas_unit: string
  mat_amount: number
  mat_inv: number
}

interface CategoriesPageProps {
  isPopup?: boolean;
  onSelectMaterial?: (materialId: number) => void;
  category?: string;
  pc_id?: number;
  measurementId?: number;
}

interface ProductVariation {
  var_id: number
  prod_id: number
  var_name: string
  var_inv: number
  var_goal: number
  materials?: Material[]
}

interface Product {
  prod_id: number
  pc_id: number
  prod_name: string
  prod_cost: number | string
  prod_msrp: number | string
  prod_time: string
}

interface ProductCategory {
  pc_id: number
  pc_name: string
}

interface NewVariation {
  var_name: string
  var_inv: number
  var_goal: number
}

interface EditingValues {
  inv: string
  goal: string
}

interface NewMaterial {
  mat_id: number
  mat_amount: number
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const fetchWithRetry = async (url: string, retries = 3, delayMs = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url)
      if (response.ok) return response
      if (response.status === 404) return null
    } catch (error) {
      if (i === retries - 1) throw error
    }
    await delay(delayMs)
  }
  throw new Error(`Failed to fetch after ${retries} retries`)
}

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [product, setProduct] = useState<Product | null>(null)
  const [category, setCategory] = useState<ProductCategory | null>(null)
  const [variations, setVariations] = useState<ProductVariation[]>([])
  const [expandedVariations, setExpandedVariations] = useState<Set<number>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [editingValues, setEditingValues] = useState<{ [key: number]: EditingValues }>({})
  const [isAddingVariation, setIsAddingVariation] = useState(false)
  const [isSubmittingVariation, setIsSubmittingVariation] = useState(false)
  const [newVariation, setNewVariation] = useState<NewVariation>({
    var_name: '',
    var_inv: 0,
    var_goal: 0
  })
  const [isEditMode, setIsEditMode] = useState(false)
  const [editedProduct, setEditedProduct] = useState<Product | null>(null)
  const [editedVariations, setEditedVariations] = useState<{[key: number]: ProductVariation}>({})
  const [deletingVariationId, setDeletingVariationId] = useState<number | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [lowMaterialAlert, setLowMaterialAlert] = useState<string | null>(null)
  const [isAddingMaterial, setIsAddingMaterial] = useState(false)
  const [selectedVariationId, setSelectedVariationId] = useState<number | null>(null)
  const [newMaterial, setNewMaterial] = useState<NewMaterial>({ mat_id: 0, mat_amount: 0 })
  const [editingMaterial, setEditingMaterial] = useState<{
    variationId: number;
    materialId: number;
    amount: string;
  } | null>(null)
  const [deletingMaterial, setDeletingMaterial] = useState<{
    variationId: number;
    materialId: number;
  } | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const [productRes, variationsRes] = await Promise.all([
          fetchWithRetry(`http://localhost:5000/api/products/${params.product}`),
          fetchWithRetry(`http://localhost:5000/api/productvariations?product=${params.product}`)
        ])

        if (!productRes || !variationsRes) {
          throw new Error('Failed to fetch product or variations data')
        }

        const [productData, variationsData] = await Promise.all([
          productRes.json(),
          variationsRes.json()
        ])

        const categoryRes = await fetchWithRetry(`http://localhost:5000/api/productcategories/${productData.pc_id}`)
        if (!categoryRes) throw new Error('Failed to fetch category')
        const categoryData = await categoryRes.json()

        setProduct(productData)
        setCategory(categoryData)
        setVariations(variationsData)

        console.log('Fetched product:', productData)
        console.log('Fetched variations:', variationsData)
        console.log('Fetched category:', categoryData)
      } catch (error) {
        console.error('Error fetching data:', error)
        setError('Failed to load product details. Please try again later.')
        toast({
          title: "Error",
          description: "Failed to load product details. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [params.product, toast])

  const toggleVariation = (variationId: number) => {
    setExpandedVariations(prev => {
      const next = new Set(prev)
      if (next.has(variationId)) {
        next.delete(variationId)
      } else {
        next.add(variationId)
      }
      return next
    })
  }

  const handleCancelEdit = (variationId: number) => {
    setEditingValues(prev => {
      const next = { ...prev }
      delete next[variationId]
      return next
    })
  }

  const calculateRequiredMaterials = (variation: ProductVariation, newInventory: number) => {
    if (!variation.materials) return true
    
    const inventoryDiff = newInventory - variation.var_inv
    
    return variation.materials.every(material => {
      const requiredAmount = material.mat_amount * inventoryDiff
      return material.mat_inv >= requiredAmount
    })
  }

  const updateMaterialInventory = (variation: ProductVariation, newInventory: number, originalInventory: number) => {
    if (!variation.materials) return variation

    const inventoryDiff = newInventory - originalInventory
    const updatedMaterials = variation.materials.map(material => {
      if (inventoryDiff > 0) {
        // Only decrease material inventory when increasing product inventory
        const requiredAmount = material.mat_amount * inventoryDiff
        const newMatInventory = material.mat_inv - requiredAmount
        return { ...material, mat_inv: newMatInventory }
      } else if (inventoryDiff < 0 && variation.var_inv > originalInventory) {
        // Only increase material inventory when decreasing product inventory,
        // and only if the new inventory is still above the original inventory
        const returnedAmount = material.mat_amount * Math.min(Math.abs(inventoryDiff), variation.var_inv - originalInventory)
        const newMatInventory = material.mat_inv + returnedAmount
        return { ...material, mat_inv: newMatInventory }
      }
      return material
    })

    return { ...variation, materials: updatedMaterials }
  }

  const fetchVariationData = async (variationId: number) => {
    try {
      const response = await fetchWithRetry(`http://localhost:5000/api/productvariations/${variationId}`)
      if (!response) throw new Error('Failed to fetch variation data')
      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error fetching variation data:', error)
      toast({
        title: "Error",
        description: "Failed to fetch updated variation data. Please refresh the page.",
        variant: "destructive",
      })
    }
  }

  const updateVariationOptimistically = useCallback((variationId: number, newData: Partial<ProductVariation>) => {
    setVariations(prevVariations => 
      prevVariations.map(v => 
        v.var_id === variationId ? { ...v, ...newData } : v
      )
    )
  }, [])

  const handleUpdateValues = async (variationId: number) => {
    const newInventory = parseFloat(editingValues[variationId].inv)
    const newGoal = parseFloat(editingValues[variationId].goal)
    if (isNaN(newInventory) || isNaN(newGoal)) {
      toast({
        title: "Error",
        description: "Please enter valid numbers for inventory and goal.",
        variant: "destructive",
      })
      return
    }

    const variation = variations.find(v => v.var_id === variationId)
    if (!variation) {
      toast({
        title: "Error",
        description: "Variation not found.",
        variant: "destructive",
      })
      return
    }

    const hasEnoughMaterials = calculateRequiredMaterials(variation, newInventory)
    if (!hasEnoughMaterials) {
      setLowMaterialAlert(`Insufficient materials available for ${variation.var_name}. Please check material inventory.`)
      return
    }

    // Optimistically update the UI
    const updatedVariation = updateMaterialInventory({ ...variation, var_inv: newInventory, var_goal: newGoal }, newInventory, variation.var_inv)
    updateVariationOptimistically(variationId, updatedVariation)

    try {
      const response = await fetch(`http://localhost:5000/api/productvariations/${variationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ var_inv: newInventory, var_goal: newGoal }),
      })

      if (!response.ok) {
        throw new Error('Failed to update values')
      }

      toast({
        title: "Success",
        description: "Values updated successfully",
      })

      // Fetch the updated variation data in the background
      fetchVariationData(variationId).then(updatedData => {
        if (updatedData) {
          updateVariationOptimistically(variationId, updatedData)
        }
      })

    } catch (error) {
      console.error('Error updating values:', error)
      // Revert the optimistic update
      updateVariationOptimistically(variationId, variation)
      toast({
        title: "Error",
        description: "Failed to update values. Please try again.",
        variant: "destructive",
      })
    } finally {
      handleCancelEdit(variationId)
    }
  }

  const handleAddVariation = async () => {
    if (!product || isSubmittingVariation) return

    setIsSubmittingVariation(true)
    try {
      const response = await fetch('http://localhost:5000/api/productvariations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prod_id: product.prod_id,
          ...newVariation,
          img_id: null
        }),
      })

      if (response.status === 201) {
        toast({
          title: "Success",
          description: "Variation added successfully. Refreshing page...",
        })
        // Reload the page after a short delay
        setTimeout(() => {
          window.location.reload()
        }, 1500)
      } else {
        throw new Error('Failed to add variation')
      }
    } catch (error) {
      console.error('Error adding variation:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add variation. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmittingVariation(false)
      setIsAddingVariation(false)
    }
  }

  const handleStartEdit = () => {
    setIsEditMode(true)
    setEditedProduct(product ? { ...product } : null)
    const variationsMap = variations.reduce((acc, variation) => {
      acc[variation.var_id] = { ...variation }
      return acc
    }, {} as {[key: number]: ProductVariation})
    setEditedVariations(variationsMap)
  }

  const handleCancelEditMode = () => {
    setIsEditMode(false)
    setEditedProduct(null)
    setEditedVariations({})
  }

  const handleSaveEdit = async () => {
    if (!editedProduct) return

    setIsSaving(true)
    setIsEditMode(false) // Exit edit mode immediately

    try {
      // Optimistically update the UI
      setProduct(editedProduct)
      setVariations(Object.values(editedVariations))

      // First validate all inventory changes
      const inventoryUpdatesValid = Object.values(editedVariations).every(variation => {
        const originalVariation = variations.find(v => v.var_id === variation.var_id)
        if (!originalVariation) return true
        return calculateRequiredMaterials(variation, variation.var_inv)
      })

      if (!inventoryUpdatesValid) {
        throw new Error('Insufficient materials for one or more inventory updates')
      }

      const productUpdate = fetch(`http://localhost:5000/api/products/${editedProduct.prod_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prod_name: editedProduct.prod_name,
          prod_cost: editedProduct.prod_cost,
          prod_msrp: editedProduct.prod_msrp,
          prod_time: editedProduct.prod_time
        })
      })

      // Update variations and their materials
      const variationUpdates = Object.values(editedVariations).map(async variation => {
        const originalVariation = variations.find(v => v.var_id === variation.var_id)
        if (originalVariation && variation.var_inv !== originalVariation.var_inv) {
          variation = updateMaterialInventory(variation, variation.var_inv, originalVariation.var_inv)
        }

        return fetch(`http://localhost:5000/api/productvariations/${variation.var_id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            var_name: variation.var_name,
            var_inv: variation.var_inv,
            var_goal: variation.var_goal
          })
        })
      })

      const results = await Promise.all([productUpdate, ...variationUpdates])

      if (results.every(res => res.ok)) {
        setIsEditMode(false)
        setEditedProduct(null)
        setEditedVariations({})
        toast({
          title: "Success",
          description: "Changes saved successfully",
        })

        // Fetch updated data in the background
        fetchData()
      } else {
        throw new Error('Some updates failed')
      }
    } catch (error) {
      console.error('Error saving changes:', error)
      // Revert optimistic updates
      setProduct(product)
      setVariations(variations)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save changes. Please try again.",
        variant: "destructive",
      })
      setIsEditMode(true) // Re-enter edit mode if there's an error
    } finally {
      setIsSaving(false)
    }
  }

  const handleProductEdit = (field: keyof Product, value: string | number) => {
    setEditedProduct(prev => prev ? { ...prev, [field]: value } : null)
  }

  const handleVariationEdit = (variationId: number, field: keyof ProductVariation, value: string | number) => {
    setEditedVariations(prev => {
      const variation = { ...prev[variationId] }
      const originalVariation = variations.find(v => v.var_id === variationId)
    
      if (field === 'var_inv' && originalVariation) {
        const originalVariationInventory = originalVariation.var_inv
        const newInventory = Math.max(0, parseInt(value as string, 10))
        const inventoryDiff = newInventory - variation.var_inv
      
        if (Number.isNaN(newInventory)) {
          return prev // Return previous state without updates if input is invalid
        }

        if (inventoryDiff > 0) {
          const hasEnoughMaterials = calculateRequiredMaterials(variation, newInventory)
        
          if (!hasEnoughMaterials) {
            setLowMaterialAlert(`Insufficient materials available for ${variation.var_name}. Please check material inventory.`)
            return prev // Return previous state without updates
          }
        }

        // Update material inventories in real-time
        if (variation.materials) {
          variation.materials = variation.materials.map(material => {
            const originalMaterialInventory = originalVariation.materials?.find(m => m.mat_id === material.mat_id)?.mat_inv || 0
            const originalVariationInventory = originalVariation.var_inv
            const materialUsed = material.mat_amount * inventoryDiff
            let newMatInventory = material.mat_inv

            if (newInventory > originalVariationInventory) {
              // Decrease material inventory when product inventory increases above original
              newMatInventory = Math.max(0, originalMaterialInventory - material.mat_amount * (newInventory - originalVariationInventory))
            } else if (newInventory < originalVariationInventory) {
              // Increase material inventory when product inventory decreases, but not above the original amount
              newMatInventory = Math.min(originalMaterialInventory, originalMaterialInventory - material.mat_amount * (newInventory - originalVariationInventory))
            } else {
              // If inventory is back to original, reset material inventory
              newMatInventory = originalMaterialInventory
            }

            return { ...material, mat_inv: newMatInventory }
          })
        }

        return {
          ...prev,
          [variationId]: {
            ...variation,
            var_inv: newInventory
          }
        }
      }

      return {
        ...prev,
        [variationId]: {
          ...variation,
          [field]: field === 'var_goal' ? Math.max(0, parseInt(value as string, 10)) : value
        }
      }
    })
  }

  const handleDeleteVariation = async (variationId: number) => {
    try {
      const response = await fetch(`http://localhost:5000/api/productvariations/${variationId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete variation')
      }

      setVariations(prev => prev.filter(v => v.var_id !== variationId))
      toast({
        title: "Success",
        description: "Variation deleted successfully",
      })
    } catch (error) {
      console.error('Error deleting variation:', error)
      toast({
        title: "Error",
        description: "Failed to delete variation. Please try again.",
        variant: "destructive",
      })
    } finally {
      setDeletingVariationId(null)
    }
  }

  const fetchData = async () => {
    try {
      const [productRes, variationsRes] = await Promise.all([
        fetchWithRetry(`http://localhost:5000/api/products/${params.product}`),
        fetchWithRetry(`http://localhost:5000/api/productvariations?product=${params.product}`)
      ])

      if (!productRes || !variationsRes) {
        throw new Error('Failed to fetch updated data')
      }

      const [productData, variationsData] = await Promise.all([
        productRes.json(),
        variationsRes.json()
      ])

      setProduct(productData)
      setVariations(variationsData)
    } catch (error) {
      console.error('Error fetching updated data:', error)
    }
  }

  const handleAddMaterial = (variationId: number) => {
    setSelectedVariationId(variationId)
    setIsAddingMaterial(true)
  }

  const handleMaterialSelection = (materialId: number) => {
    setNewMaterial(prev => ({ ...prev, mat_id: materialId }))
  }

  const handleMaterialAmountChange = (amount: number) => {
    setNewMaterial(prev => ({ ...prev, mat_amount: amount }))
  }

  const handleSaveMaterial = async () => {
    if (!selectedVariationId || newMaterial.mat_id === 0 || newMaterial.mat_amount <= 0) {
      toast({
        title: "Error",
        description: "Please select a material and enter a valid amount.",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch(`http://localhost:5000/api/variationmaterials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          var_id: selectedVariationId,
          mat_id: newMaterial.mat_id,
          mat_amount: newMaterial.mat_amount,
        }),
      })

      if (response.status === 200) {
        toast({
          title: "Success",
          description: "Material added to variation successfully. Refreshing page...",
        })
        // Reload the page after a short delay
        setTimeout(() => {
          window.location.reload()
        }, 1500)
      } else {
        throw new Error('Failed to add material to variation')
      }
    } catch (error) {
      console.error('Error adding material to variation:', error)
      toast({
        title: "Error",
        description: "Failed to add material to variation. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsAddingMaterial(false)
      setNewMaterial({ mat_id: 0, mat_amount: 0 })
    }
  }

  const handleUpdateMaterialAmount = async (variationId: number, materialId: number) => {
    if (!editingMaterial) return

    const amount = parseFloat(editingMaterial.amount)
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid amount greater than 0.",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch(`http://localhost:5000/api/variationmaterials/${variationId}/${materialId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mat_amount: amount
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update material amount')
      }

      // Refresh the variation data
      const updatedVariation = await fetchVariationData(variationId)
      if (updatedVariation) {
        setVariations(prev => prev.map(v => 
          v.var_id === variationId ? updatedVariation : v
        ))
      }

      setEditingMaterial(null)
      toast({
        title: "Success",
        description: "Material amount updated successfully",
      })
    } catch (error) {
      console.error('Error updating material amount:', error)
      toast({
        title: "Error",
        description: "Failed to update material amount. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteMaterial = async (variationId: number, materialId: number) => {
    try {
      const response = await fetch(`http://localhost:5000/api/variationmaterials/${variationId}/${materialId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete material')
      }

      // Refresh the variation data
      const updatedVariation = await fetchVariationData(variationId)
      if (updatedVariation) {
        setVariations(prev => prev.map(v => 
          v.var_id === variationId ? updatedVariation : v
        ))
      }

      toast({
        title: "Success",
        description: "Material deleted successfully",
      })
    } catch (error) {
      console.error('Error deleting material:', error)
      toast({
        title: "Error",
        description: "Failed to delete material. Please try again.",
        variant: "destructive",
      })
    } finally {
      setDeletingMaterial(null)
    }
  }

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen text-black">Loading...</div>
  }

  if (error) {
    return <div className="flex items-center justify-center h-screen text-red-600">{error}</div>
  }

  if (!product) {
    return <div className="flex items-center justify-center h-screen text-black">Product not found</div>
  }

  const displayProduct = isEditMode ? editedProduct || product : product
  const displayVariations = isEditMode ? Object.values(editedVariations) : variations

  const profit = Number(displayProduct.prod_msrp) - Number(displayProduct.prod_cost)
  const margin = (profit / Number(displayProduct.prod_msrp) * 100)
  const hourlyRate = Number(displayProduct.prod_msrp) / parseFloat(displayProduct.prod_time)
  const totalInventory = displayVariations.reduce((sum, v) => sum + v.var_inv, 0)
  const totalGoal = displayVariations.reduce((sum, v) => sum + v.var_goal, 0)

  return (
    <motion.div 
      className="min-h-screen p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div 
        className="max-w-5xl mx-auto bg-white rounded-xl shadow-lg p-8"
        initial={{ y: 20 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Button 
          variant="ghost" 
          className="mb-6 text-purple-700 hover:bg-purple-50" 
          onClick={() => router.back()}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>

        {lowMaterialAlert && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Warning</AlertTitle>
            <AlertDescription>{lowMaterialAlert}</AlertDescription>
          </Alert>
        )}

        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <div className="mb-4 sm:mb-0">
            <h1 className="text-3xl font-bold mb-1 text-purple-900">
              {isEditMode ? (
                <Input
                  value={displayProduct.prod_name}
                  onChange={(e) => handleProductEdit('prod_name', e.target.value)}
                  className="text-3xl font-bold w-full sm:w-auto"
                />
              ) : (
                displayProduct.prod_name
              )}
            </h1>
            <div className="text-sm text-purple-600 font-medium">
              {totalInventory}/{totalGoal} {category?.pc_name.toUpperCase()}
            </div>
          </div>
          {isEditMode ? (
            <div className="space-y-2 sm:space-y-0 sm:space-x-2 flex flex-col sm:flex-row">
              <Button 
                onClick={handleSaveEdit} 
                className="bg-purple-600 hover:bg-purple-700 text-white transition-colors duration-200 w-full sm:w-auto" 
                disabled={isSaving}
              >
                <Check className="mr-2 h-4 w-4" /> {isSaving ? 'Saving...' : 'Save'}
              </Button>
              <Button 
                onClick={handleCancelEditMode} 
                variant="outline" 
                className="text-purple-600 border-purple-300 hover:bg-purple-50 transition-colors duration-200 w-full sm:w-auto"
              >
                <X className="mr-2 h-4 w-4" /> Cancel
              </Button>
            </div>
          ) : (
            <Button 
              onClick={handleStartEdit} 
              variant="outline" 
              className="text-purple-600 border-purple-300 hover:bg-purple-50 transition-colors duration-200 w-full sm:w-auto"
            >
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </Button>
          )}
        </div>

        <Card className="mb-8 border-purple-200 shadow-md rounded-lg overflow-hidden">
          <CardContent className="p-6 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-purple-50">
                  <TableHead className="text-purple-900 font-semibold">Cost</TableHead>
                  <TableHead className="text-purple-900 font-semibold">MSRP</TableHead>
                  <TableHead className="text-purple-700">Profit</TableHead>
                  <TableHead className="text-purple-700">Margin</TableHead>
                  <TableHead className="text-purple-700">Time</TableHead>
                  <TableHead className="text-purple-700">$/hour</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="text-purple-900 font-bold">
                    {isEditMode ? (
                      <Input
                        type="number"
                        value={displayProduct.prod_cost}
                        onChange={(e) => handleProductEdit('prod_cost', parseFloat(e.target.value))}
                        className="w-24 font-bold"
                      />
                    ) : (
                      `$${typeof displayProduct.prod_cost === 'number' ? displayProduct.prod_cost.toFixed(2) : displayProduct.prod_cost}`
                    )}
                  </TableCell>
                  <TableCell className="text-purple-900 font-bold">
                    {isEditMode ? (
                      <Input
                        type="number"
                        value={displayProduct.prod_msrp}
                        onChange={(e) => handleProductEdit('prod_msrp', parseFloat(e.target.value))}
                        className="w-24 font-bold"
                      />
                    ) : (
                      `$${typeof displayProduct.prod_msrp === 'number' ? displayProduct.prod_msrp.toFixed(2) : displayProduct.prod_msrp}`
                    )}
                  </TableCell>
                  <TableCell className="text-purple-700">${profit.toFixed(2)}</TableCell>
                  <TableCell className="text-purple-700">{margin.toFixed(2)}%</TableCell>
                  <TableCell className="text-purple-700">
                    {isEditMode ? (
                      <Input
                        value={displayProduct.prod_time}
                        onChange={(e) => handleProductEdit('prod_time', e.target.value)}
                        className="w-24"
                      />
                    ) : (
                      displayProduct.prod_time
                    )}
                  </TableCell>
                  <TableCell className="text-purple-700">${hourlyRate.toFixed(2)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="mb-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-purple-900">Variations</h2>
          <Button 
            onClick={() => setIsAddingVariation(true)} 
            className="bg-purple-600 hover:bg-purple-700 text-white transition-colors duration-200"
          >
            <Plus className="mr-2 h-4 w-4" /> Add Variation
          </Button>
        </div>

        {displayVariations.map((variation) => (
          <Fragment key={variation.var_id}>
            <Card className="mb-4 border-purple-200 shadow-sm rounded-lg overflow-hidden">
              <CardContent className="p-4">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mr-2 p-0 hover:bg-transparent"
                      onClick={() => toggleVariation(variation.var_id)}
                    >
                      <ChevronDown
                        className={`h-5 w-5 text-purple-600 transition-transform ${
                          expandedVariations.has(variation.var_id) ? 'transform rotate-180' : ''
                        }`}
                      />
                    </Button>
                    <h3 className="text-lg font-semibold text-purple-900">
                      {isEditMode ? (
                        <Input
                          value={variation.var_name}
                          onChange={(e) => handleVariationEdit(variation.var_id, 'var_name', e.target.value)}
                          className="text-lg font-semibold w-full sm:w-auto"
                        />
                      ) : (
                        variation.var_name
                      )}
                    </h3>
                  </div>
                  {isEditMode ? (
                    <div className="flex items-center space-x-2">
                      <Input
                        type="number"
                        value={variation.var_inv}
                        onChange={(e) => handleVariationEdit(variation.var_id, 'var_inv', e.target.value)}
                        className="w-20 text-right"
                      />
                      <span className="text-purple-600">/</span>
                      <Input
                        type="number"
                        value={variation.var_goal}
                        onChange={(e) => handleVariationEdit(variation.var_id, 'var_goal', e.target.value)}
                        className="w-20 text-right"
                      />
                    </div>
                  ) : (
                    <div className="text-purple-600 font-medium">
                      {variation.var_inv}/{variation.var_goal}
                    </div>
                  )}
                </div>
                {expandedVariations.has(variation.var_id) && (
                  <div className="mt-4">
                    <h4 className="text-sm font-semibold text-purple-900 mb-2">Materials:</h4>
                    {variation.materials && variation.materials.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-purple-50">
                            <TableHead className="text-purple-900 font-semibold">Name</TableHead>
                            <TableHead className="text-purple-900 font-semibold">Brand</TableHead>
                            <TableHead className="text-purple-900 font-semibold">Category</TableHead>
                            <TableHead className="text-purple-900 font-semibold">Required</TableHead>
                            <TableHead className="text-purple-900 font-semibold">Inventory</TableHead>
                            {isEditMode && (
                              <TableHead className="text-purple-900 font-semibold">Actions</TableHead>
                            )}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {variation.materials.map((material) => (
                            <TableRow key={material.mat_id}>
                              <TableCell>{material.mat_name}</TableCell>
                              <TableCell>{material.brand_name}</TableCell>
                              <TableCell>{material.mc_name}</TableCell>
                              <TableCell>
                                {editingMaterial?.materialId === material.mat_id ? (
                                  <div className="flex items-center space-x-2">
                                    <Input
                                      type="number"
                                      value={editingMaterial.amount}
                                      onChange={(e) => setEditingMaterial(prev => ({
                                        ...prev!,
                                        amount: e.target.value
                                      }))}
                                      className="w-24"
                                    />
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleUpdateMaterialAmount(variation.var_id, material.mat_id)}
                                    >
                                      <Check className="h-4 w-4 text-green-600" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => setEditingMaterial(null)}
                                    >
                                      <X className="h-4 w-4 text-red-600" />
                                    </Button>
                                  </div>
                                ) : (
                                  <span>
                                    {material.mat_amount} {material.meas_unit}
                                    {isEditMode && (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => setEditingMaterial({
                                          variationId: variation.var_id,
                                          materialId: material.mat_id,
                                          amount: material.mat_amount.toString()
                                        })}
                                        className="ml-2"
                                      >
                                        <Pencil className="h-4 w-4 text-purple-600" />
                                      </Button>
                                    )}
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>{material.mat_inv} {material.meas_unit}</TableCell>
                              {isEditMode && (
                                <TableCell>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setDeletingMaterial({
                                      variationId: variation.var_id,
                                      materialId: material.mat_id
                                    })}
                                    className="text-red-600"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              )}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-purple-600">No materials added yet.</p>
                    )}
                    {!isEditMode && (
                      <Button 
                        onClick={() => handleAddMaterial(variation.var_id)} 
                        className="mt-4 bg-purple-600 hover:bg-purple-700 text-white transition-colors duration-200"
                      >
                        <Plus className="mr-2 h-4 w-4" /> Add Material
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
            {!isEditMode && (
              <div className="flex justify-end mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 border-red-300 hover:bg-red-50 transition-colors duration-200"
                  onClick={() => setDeletingVariationId(variation.var_id)}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Delete Variation
                </Button>
              </div>
            )}
          </Fragment>
        ))}

        <AlertDialog open={deletingVariationId !== null} onOpenChange={() => setDeletingVariationId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the variation
                and all associated data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deletingVariationId && handleDeleteVariation(deletingVariationId)}
                className="bg-red-600 text-white hover:bg-red-700"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog 
          open={deletingMaterial !== null} 
          onOpenChange={() => setDeletingMaterial(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Material</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove this material from the variation?
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (deletingMaterial) {
                    handleDeleteMaterial(
                      deletingMaterial.variationId,
                      deletingMaterial.materialId
                    )
                  }
                }}
                className="bg-red-600 text-white hover:bg-red-700"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog open={isAddingVariation} onOpenChange={() => setIsAddingVariation(false)}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Variation</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="name" className="text-right">
                  Name
                </label>
                <Input
                  id="name"
                  value={newVariation.var_name}
                  onChange={(e) => setNewVariation({ ...newVariation, var_name: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="inventory" className="text-right">
                  Inventory
                </label>
                <Input
                  id="inventory"
                  type="number"
                  value={newVariation.var_inv}
                  onChange={(e) => setNewVariation({ ...newVariation, var_inv: parseInt(e.target.value) })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="goal" className="text-right">
                  Goal
                </label>
                <Input
                  id="goal"
                  type="number"
                  value={newVariation.var_goal}
                  onChange={(e) => setNewVariation({ ...newVariation, var_goal: parseInt(e.target.value) })}
                  className="col-span-3"
                />
              </div>
            </div>
            <Button onClick={handleAddVariation} className="w-full bg-purple-600 hover:bg-purple-700 text-white">
              {isSubmittingVariation ? 'Adding...' : 'Add Variation'}
            </Button>
          </DialogContent>
        </Dialog>

        <Dialog open={isAddingMaterial} onOpenChange={() => setIsAddingMaterial(false)}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Add Material to Variation</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="h-[400px] overflow-y-auto">
                <CategoriesPage 
                  isPopup={true} 
                  onSelectMaterial={handleMaterialSelection}
                  category={category?.pc_name || ''}
                  pc_id={category?.pc_id || 0}
                  measurementId={0}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="amount" className="text-right">
                  Amount
                </label>
                <Input
                  id="amount"
                  type="number"
                  value={newMaterial.mat_amount}
                  onChange={(e) => handleMaterialAmountChange(parseFloat(e.target.value))}
                  className="col-span-3"
                />
              </div>
            </div>
            <Button onClick={handleSaveMaterial} className="w-full bg-purple-600 hover:bg-purple-700 text-white">
              Add Material
            </Button>
          </DialogContent>
        </Dialog>
      </motion.div>
    </motion.div>
  )
}