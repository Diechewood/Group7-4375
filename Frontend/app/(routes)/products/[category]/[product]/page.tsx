'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Check, X, Plus } from 'lucide-react'
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

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

interface ProductVariation {
  var_id: number
  prod_id: number
  var_name: string
  var_inv: number
  var_goal: number
}

interface NewVariation {
  var_name: string
  var_inv: number
  var_goal: number
}

interface Toast {
  message: string
  type: 'success' | 'error'
}

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [product, setProduct] = useState<Product | null>(null)
  const [category, setCategory] = useState<ProductCategory | null>(null)
  const [variations, setVariations] = useState<ProductVariation[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [editingInventory, setEditingInventory] = useState<{ [key: number]: string }>({})
  const [isAddingVariation, setIsAddingVariation] = useState(false)
  const [newVariation, setNewVariation] = useState<NewVariation>({
    var_name: '',
    var_inv: 0,
    var_goal: 0
  })
  const [toast, setToast] = useState<Toast | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const [productRes, variationsRes] = await Promise.all([
          fetch(`http://localhost:5000/api/products/${params.product}`),
          fetch(`http://localhost:5000/api/productvariations?product=${params.product}`)
        ])

        if (!productRes.ok || !variationsRes.ok) {
          throw new Error('Failed to fetch data')
        }

        const [productData, variationsData] = await Promise.all([
          productRes.json(),
          variationsRes.json()
        ])

        // Fetch category data
        const categoryRes = await fetch(`http://localhost:5000/api/productcategories/${productData.pc_id}`)
        if (!categoryRes.ok) throw new Error('Failed to fetch category')
        const categoryData = await categoryRes.json()

        setProduct(productData)
        setCategory(categoryData)
        setVariations(variationsData)
      } catch (error) {
        console.error('Error fetching data:', error)
        setError('Failed to load product details. Please try again later.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [params.product])

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleEditInventory = (variationId: number, currentInventory: number) => {
    setEditingInventory(prev => ({ ...prev, [variationId]: currentInventory.toString() }))
  }

  const handleCancelEdit = (variationId: number) => {
    setEditingInventory(prev => {
      const next = { ...prev }
      delete next[variationId]
      return next
    })
  }

  const handleUpdateInventory = async (variationId: number) => {
    const newInventory = parseFloat(editingInventory[variationId])
    if (isNaN(newInventory)) {
      showToast("Please enter a valid number for inventory.", "error")
      return
    }

    try {
      const response = await fetch(`http://localhost:5000/api/productvariations/${variationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ var_inv: newInventory }),
      })

      if (!response.ok) throw new Error('Failed to update inventory')

      setVariations(prev =>
        prev.map(v =>
          v.var_id === variationId ? { ...v, var_inv: newInventory } : v
        )
      )

      handleCancelEdit(variationId)
      showToast("Inventory updated successfully", "success")
    } catch (error) {
      console.error('Error updating inventory:', error)
      showToast("Failed to update inventory. Please try again.", "error")
    }
  }

  const handleAddVariation = async () => {
    if (!product) return

    try {
      const response = await fetch('http://localhost:5000/api/productvariations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prod_id: product.prod_id,
          ...newVariation,
          img_id: null // Explicitly set img_id to null
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to add variation')
      }

      const updatedVariationsRes = await fetch(`http://localhost:5000/api/productvariations?product=${params.product}`)
      if (!updatedVariationsRes.ok) throw new Error('Failed to fetch updated variations')
      
      const updatedVariations = await updatedVariationsRes.json()
      setVariations(updatedVariations)
      setIsAddingVariation(false)
      setNewVariation({ var_name: '', var_inv: 0, var_goal: 0 })
      showToast("Variation added successfully", "success")
    } catch (error) {
      console.error('Error adding variation:', error)
      showToast(error instanceof Error ? error.message : "Failed to add variation. Please try again.", "error")
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

  const profit = Number(product.prod_msrp) - Number(product.prod_cost)
  const margin = (profit / Number(product.prod_msrp) * 100)
  const hourlyRate = Number(product.prod_msrp) / parseFloat(product.prod_time)
  const totalInventory = variations.reduce((sum, v) => sum + v.var_inv, 0)
  const totalGoal = variations.reduce((sum, v) => sum + v.var_goal, 0)

  return (
    <div className="p-6 relative">
      {toast && (
        <div 
          className={`fixed bottom-4 right-4 p-4 rounded-md ${
            toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
          } text-white shadow-lg z-50`}
          style={{ pointerEvents: 'none' }}
        >
          {toast.message}
        </div>
      )}
      <div className="max-w-5xl mx-auto bg-white rounded-xl shadow-lg p-6">
        <Button 
          variant="ghost" 
          className="mb-6 text-black hover:bg-gray-100" 
          onClick={() => router.back()}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>

        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-1 text-black">{product.prod_name}</h1>
          <div className="text-sm text-gray-600">
            {totalInventory}/{totalGoal} {category?.pc_name.toUpperCase()}
          </div>
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
                  <TableCell className="text-black">${typeof product.prod_cost === 'number' ? product.prod_cost.toFixed(2) : product.prod_cost}</TableCell>
                  <TableCell className="text-black">${typeof product.prod_msrp === 'number' ? product.prod_msrp.toFixed(2) : product.prod_msrp}</TableCell>
                  <TableCell className="text-black">${profit.toFixed(2)}</TableCell>
                  <TableCell className="text-black">{margin.toFixed(2)}%</TableCell>
                  <TableCell className="text-black">{product.prod_time}</TableCell>
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
              {variations.map((variation) => (
                <TableRow key={variation.var_id} className="border-b border-gray-200">
                  <TableCell className="text-black">{variation.var_name}</TableCell>
                  <TableCell className="text-black">
                    {editingInventory[variation.var_id] !== undefined ? (
                      <div className="flex items-center space-x-2">
                        <Input
                          type="number"
                          value={editingInventory[variation.var_id]}
                          onChange={(e) => setEditingInventory(prev => ({ ...prev, [variation.var_id]: e.target.value }))}
                          className="w-20 text-black"
                        />
                        <Button size="sm" variant="ghost" onClick={() => handleUpdateInventory(variation.var_id)}>
                          <Check className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleCancelEdit(variation.var_id)}>
                          <X className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    ) : (
                      variation.var_inv
                    )}
                  </TableCell>
                  <TableCell className="text-black">{variation.var_goal}</TableCell>
                  <TableCell>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleEditInventory(variation.var_id, variation.var_inv)}
                      className="text-black hover:bg-gray-100"
                    >
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
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
                      <Button size="sm" variant="outline" onClick={handleAddVariation} className="text-black hover:bg-gray-100">
                        <Check className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setIsAddingVariation(false)} className="text-black hover:bg-gray-100">
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
                      className="w-full text-black hover:bg-gray-100"
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
    </div>
  )
}