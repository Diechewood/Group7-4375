'use client'

import { useState, useEffect, Fragment } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Check, X, Plus, ChevronDown, ChevronRight, Pencil, Trash2 } from 'lucide-react'
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

interface Material {
  mat_id: number
  mat_name: string
  mat_sku: string
  brand_name: string
  mc_name: string
  meas_unit: string
  mat_amount: number
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

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const [productRes, variationsRes, materialsRes] = await Promise.all([
          fetchWithRetry(`http://localhost:5000/api/products/${params.product}`),
          fetchWithRetry(`http://localhost:5000/api/productvariations?product=${params.product}`),
          fetchWithRetry(`http://localhost:5000/api/variationmaterials`)
        ])

        if (!productRes || !variationsRes || !materialsRes) {
          throw new Error('Failed to fetch product, variations, or materials data')
        }

        const [productData, variationsData, materialsData] = await Promise.all([
          productRes.json(),
          variationsRes.json(),
          materialsRes.json()
        ])

        const categoryRes = await fetchWithRetry(`http://localhost:5000/api/productcategories/${productData.pc_id}`)
        if (!categoryRes) throw new Error('Failed to fetch category')
        const categoryData = await categoryRes.json()

        setProduct(productData)
        setCategory(categoryData)

        const combinedVariations = variationsData.map((variation: ProductVariation) => ({
          ...variation,
          materials: materialsData[variation.var_id] || []
        }))
        setVariations(combinedVariations)

        console.log('Fetched product:', productData)
        console.log('Fetched variations:', combinedVariations)
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

  const handleEditValues = (variationId: number, currentInventory: number, currentGoal: number) => {
    setEditingValues(prev => ({ 
      ...prev, 
      [variationId]: { inv: currentInventory.toString(), goal: currentGoal.toString() } 
    }))
  }

  const handleCancelEdit = (variationId: number) => {
    setEditingValues(prev => {
      const next = { ...prev }
      delete next[variationId]
      return next
    })
  }

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

    try {
      const response = await fetch(`http://localhost:5000/api/productvariations/${variationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ var_inv: newInventory, var_goal: newGoal }),
      })

      if (!response.ok) throw new Error('Failed to update values')

      const updatedVariation = await response.json()
      setVariations(prev =>
        prev.map(v => v.var_id === variationId ? { ...updatedVariation, materials: v.materials } : v)
      )

      handleCancelEdit(variationId)
      toast({
        title: "Success",
        description: "Values updated successfully",
      })
    } catch (error) {
      console.error('Error updating values:', error)
      toast({
        title: "Error",
        description: "Failed to update values. Please try again.",
        variant: "destructive",
      })
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

      if (!response.ok) {
        const errorData = await response.text()
        throw new Error(errorData || 'Failed to add variation')
      }

      const responseText = await response.text()
      let newVariationData: ProductVariation

      if (responseText) {
        try {
          newVariationData = JSON.parse(responseText)
        } catch (parseError) {
          console.error('Error parsing response:', parseError)
          throw new Error('Invalid response from server')
        }
      } else {
        newVariationData = {
          ...newVariation,
          var_id: Date.now(),
          prod_id: product.prod_id,
          materials: []
        }
      }

      setVariations(prev => [...prev, newVariationData])
      setIsAddingVariation(false)
      setNewVariation({ var_name: '', var_inv: 0, var_goal: 0 })
      toast({
        title: "Success",
        description: "Variation added successfully",
      })
    } catch (error) {
      console.error('Error adding variation:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add variation. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmittingVariation(false)
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

    setIsLoading(true)
    try {
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

      const variationUpdates = Object.values(editedVariations).map(variation =>
        fetch(`http://localhost:5000/api/productvariations/${variation.var_id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            var_name: variation.var_name,
            var_inv: variation.var_inv,
            var_goal: variation.var_goal
          })
        })
      )

      const results = await Promise.all([productUpdate, ...variationUpdates])

      if (results.every(res => res.ok)) {
        setProduct(editedProduct)
        setVariations(Object.values(editedVariations))
        setIsEditMode(false)
        setEditedProduct(null)
        setEditedVariations({})
        toast({
          title: "Success",
          description: "Changes saved successfully",
        })
      } else {
        throw new Error('Some updates failed')
      }
    } catch (error) {
      console.error('Error saving changes:', error)
      toast({
        title: "Error",
        description: "Failed to save changes. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleProductEdit = (field: keyof Product, value: string | number) => {
    setEditedProduct(prev => prev ? { ...prev, [field]: value } : null)
  }

  const handleVariationEdit = (variationId: number, field: keyof ProductVariation, value: string | number) => {
    setEditedVariations(prev => ({
      ...prev,
      [variationId]: {
        ...prev[variationId],
        [field]: value
      }
    }))
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
    <div className="p-6 relative">
      <div className="max-w-5xl mx-auto bg-white rounded-xl shadow-lg p-6">
        <Button 
          variant="ghost" 
          className="mb-6 text-black hover:bg-gray-100" 
          onClick={() => router.back()}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>

        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold mb-1 text-black">
              {isEditMode ? (
                <Input
                  value={displayProduct.prod_name}
                  onChange={(e) => handleProductEdit('prod_name', e.target.value)}
                  className="text-2xl font-bold"
                />
              ) : (
                displayProduct.prod_name
              )}
            </h1>
            <div className="text-sm text-gray-600">
              {totalInventory}/{totalGoal} {category?.pc_name.toUpperCase()}
            </div>
          </div>
          {isEditMode ? (
            <div className="space-x-2">
              <Button onClick={handleSaveEdit} className="bg-green-500 hover:bg-green-600 text-white">
                <Check className="mr-2 h-4 w-4" /> Save
              </Button>
              <Button onClick={handleCancelEditMode} variant="outline" className="text-red-500 border-red-500 hover:bg-red-50">
                <X className="mr-2 h-4 w-4" /> Cancel
              </Button>
            </div>
          ) : (
            <Button onClick={handleStartEdit} variant="outline" className="bg-[#3b3b99] text-white hover:bg-[#2f2f7a]">
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </Button>
          )}
        </div>

        <Card className="mb-6 border-0 shadow-sm rounded-lg">
          <CardContent className="p-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-black font-medium">Cost</TableHead>
                  <TableHead className="text-black font-medium">MSRP</TableHead>
                  <TableHead className="text-black font-medium">Profit</TableHead>
                  <TableHead className="text-black font-medium">Margin</TableHead>
                  <TableHead className="text-black font-medium">Time</TableHead>
                  <TableHead className="text-black font-medium">$/hour</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="text-black">
                    {isEditMode ? (
                      <Input
                        type="number"
                        value={displayProduct.prod_cost}
                        onChange={(e) => handleProductEdit('prod_cost', parseFloat(e.target.value))}
                        className="w-24"
                      />
                    ) : (
                      `$${typeof displayProduct.prod_cost === 'number' ? displayProduct.prod_cost.toFixed(2) : displayProduct.prod_cost}`
                    )}
                  </TableCell>
                  <TableCell className="text-black">
                    {isEditMode ? (
                      <Input
                        type="number"
                        value={displayProduct.prod_msrp}
                        onChange={(e) => handleProductEdit('prod_msrp', parseFloat(e.target.value))}
                        className="w-24"
                      />
                    ) : (
                      `$${typeof displayProduct.prod_msrp === 'number' ? displayProduct.prod_msrp.toFixed(2) : displayProduct.prod_msrp}`
                    )}
                  </TableCell>
                  <TableCell className="text-black">${profit.toFixed(2)}</TableCell>
                  <TableCell className="text-black">{margin.toFixed(2)}%</TableCell>
                  <TableCell className="text-black">
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
                  <TableCell className="text-black">${hourlyRate.toFixed(2)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="mb-4">
          <h2 className="text-xl font-semibold mb-4 text-black">Variations</h2>
          <Table>
            <TableHeader>
              <TableRow className="border-b border-gray-200">
                <TableHead className="text-black font-medium">Name</TableHead>
                <TableHead className="text-black font-medium">Inventory</TableHead>
                <TableHead className="text-black font-medium">Goal</TableHead>
                <TableHead className="text-black font-medium">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayVariations.map((variation) => (
                <Fragment key={variation.var_id}>
                  <TableRow 
                    className="border-b border-gray-300 cursor-pointer hover:bg-gray-50"
                    onClick={() => toggleVariation(variation.var_id)}
                  >
                    <TableCell className="text-black">
                      <div className="flex items-center">
                        {expandedVariations.has(variation.var_id) ? (
                          <ChevronDown className="h-4 w-4 mr-2 text-gray-600" />
                        ) : (
                          <ChevronRight className="h-4 w-4 mr-2 text-gray-600" />
                        )}
                        {isEditMode ? (
                          <Input
                            value={variation.var_name}
                            onChange={(e) => handleVariationEdit(variation.var_id, 'var_name', e.target.value)}
                            className="w-full max-w-[200px]"
                          />
                        ) : (
                          variation.var_name
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-black">
                      {isEditMode ? (
                        <Input
                          type="number"
                          value={variation.var_inv}
                          onChange={(e) => handleVariationEdit(variation.var_id, 'var_inv', parseInt(e.target.value))}
                          className="w-20"
                        />
                      ) : (
                        variation.var_inv
                      )}
                    </TableCell>
                    <TableCell className="text-black">
                      {isEditMode ? (
                        <Input
                          type="number"
                          value={variation.var_goal}
                          onChange={(e) => handleVariationEdit(variation.var_id, 'var_goal', parseInt(e.target.value))}
                          className="w-20"
                        />
                      ) : (
                        variation.var_goal
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditMode ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation()
                            setDeletingVariationId(variation.var_id)
                          }}
                          className="text-red-500 border-red-500 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation()
                            setDeletingVariationId(variation.var_id)
                          }}
                          className="text-red-500 border-red-500 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                  {expandedVariations.has(variation.var_id) && (
                    <TableRow>
                      <TableCell colSpan={4} className="bg-gray-50 p-4">
                        <h4 className="font-medium text-sm mb-2">Materials Required:</h4>
                        {variation.materials && variation.materials.length > 0 ? (
                          <div className="space-y-2">
                            {variation.materials.map((material) => (
                              <div key={material.mat_id} className="flex items-center justify-between text-sm">
                                <span>{material.mat_name}</span>
                                <span>{material.mat_amount} {material.meas_unit}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">No materials assigned to this variation.</p>
                        )}
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))}
              {isAddingVariation ? (
                <TableRow className="border-b border-gray-200">
                  <TableCell>
                    <Input
                      value={newVariation.var_name}
                      onChange={(e) => setNewVariation(prev => ({ ...prev, var_name: e.target.value }))}
                      placeholder="Variation name"
                      className="text-black"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={newVariation.var_inv}
                      onChange={(e) => setNewVariation(prev => ({ ...prev, var_inv: parseInt(e.target.value) }))}
                      className="w-20 text-black"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={newVariation.var_goal}
                      onChange={(e) => setNewVariation(prev => ({ ...prev, var_goal: parseInt(e.target.value) }))}
                      className="w-20 text-black"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={handleAddVariation} 
                        className="text-black hover:bg-gray-100"
                        disabled={isSubmittingVariation}
                      >
                        {isSubmittingVariation ? (
                          <span className="animate-pulse">Adding...</span>
                        ) : (
                          <Check className="h-4 w-4 text-green-600" />
                        )}
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => setIsAddingVariation(false)} 
                        className="text-black hover:bg-gray-100"
                        disabled={isSubmittingVariation}
                      >
                        <X className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                <TableRow>
                  <TableCell colSpan={4}>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="w-full bg-[#3b3b99] text-white hover:bg-[#2f2f7a]"
                      onClick={() => setIsAddingVariation(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Variation
                    </Button>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      <AlertDialog open={deletingVariationId !== null} onOpenChange={() => setDeletingVariationId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this variation?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the variation and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deletingVariationId && handleDeleteVariation(deletingVariationId)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}