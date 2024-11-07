'use client'

import { useState, useEffect, useCallback, Fragment } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, ArrowLeft, ArrowUpDown, AlertCircle, ChevronDown, ChevronRight, Check, X } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import Link from 'next/link'
import { useToast } from "@/hooks/use-toast"
import { Label } from "@/components/ui/label"

const formatCurrency = (value: number | string | null | undefined): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return num != null && !isNaN(num) ? `$${num.toFixed(2)}` : '-';
};

interface ProductCategory {
  pc_id: number
  pc_name: string
  img_id: string | null
}

interface Product {
  prod_id: number
  pc_id: number
  prod_name: string
  prod_cost: number
  prod_msrp: number
  prod_time: string
}

interface ProductVariation {
  var_id: number
  prod_id: number
  var_name: string
  var_inv: number
  var_goal: number
}

interface GroupedVariations {
  [key: number]: ProductVariation[]
}

interface NewProduct {
  prod_name: string
  prod_cost: number
  prod_msrp: number
  prod_time: string
}

export default function ProductsCategoryPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [category, setCategory] = useState<ProductCategory | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [variations, setVariations] = useState<ProductVariation[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [retryCount, setRetryCount] = useState(0)
  const [expandedProducts, setExpandedProducts] = useState<Set<number>>(new Set())
  const [editingInventory, setEditingInventory] = useState<{ [key: number]: string }>({})
  const [isAddingProduct, setIsAddingProduct] = useState(false)
  const [newProduct, setNewProduct] = useState<NewProduct>({
    prod_name: '',
    prod_cost: 0,
    prod_msrp: 0,
    prod_time: ''
  })

  const decodedCategory = decodeURIComponent(params.category as string)

  const fetchData = useCallback(async (signal: AbortSignal) => {
    setIsLoading(true)
    setError(null)
    try {
      const categoriesRes = await fetch('http://localhost:5000/api/productcategories', { signal })
      if (!categoriesRes.ok) throw new Error('Failed to fetch categories')
      
      const categories: ProductCategory[] = await categoriesRes.json()
      const currentCategory = categories.find(c => c.pc_name === decodedCategory)
      if (!currentCategory) throw new Error('Category not found')
      
      setCategory(currentCategory)

      const [productsRes, variationsRes] = await Promise.all([
        fetch('http://localhost:5000/api/products', { signal }),
        fetch('http://localhost:5000/api/productvariations', { signal })
      ])

      if (!productsRes.ok || !variationsRes.ok) {
        throw new Error('Failed to fetch data')
      }

      const [productsData, variationsData] = await Promise.all([
        productsRes.json(),
        variationsRes.json()
      ])

      const categoryProducts = productsData.filter((product: Product) => 
        product.pc_id === currentCategory.pc_id
      )

      setProducts(categoryProducts)
      setVariations(variationsData)
      setRetryCount(0)
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        console.log('Fetch aborted')
        return
      }
      console.error('Error fetching data:', error)
      setError('Failed to load products. Retrying...')
      if (retryCount < 3) {
        setRetryCount(prevCount => prevCount + 1)
      } else {
        setError('Failed to load products after multiple attempts. Please try again later.')
      }
    } finally {
      setIsLoading(false)
    }
  }, [decodedCategory, retryCount])

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

  const filteredProducts = products.filter(product =>
    product.prod_name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const groupedVariations = variations.reduce((acc: GroupedVariations, variation) => {
    if (!acc[variation.prod_id]) {
      acc[variation.prod_id] = []
    }
    acc[variation.prod_id].push(variation)
    return acc
  }, {})

  const toggleProduct = (productId: number) => {
    setExpandedProducts(prev => {
      const next = new Set(prev)
      if (next.has(productId)) {
        next.delete(productId)
      } else {
        next.add(productId)
      }
      return next
    })
  }

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    return sortDirection === 'asc'
      ? a.prod_name.localeCompare(b.prod_name)
      : b.prod_name.localeCompare(a.prod_name)
  })

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
      toast({
        title: "Error",
        description: "Please enter a valid number for inventory.",
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
        body: JSON.stringify({ var_inv: newInventory }),
      })

      if (!response.ok) throw new Error('Failed to update inventory')

      setVariations(prev =>
        prev.map(v =>
          v.var_id === variationId ? { ...v, var_inv: newInventory } : v
        )
      )

      handleCancelEdit(variationId)
      toast({
        title: "Success",
        description: "Inventory updated successfully",
      })
    } catch (error) {
      console.error('Error updating inventory:', error)
      toast({
        title: "Error",
        description: "Failed to update inventory. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleAddProduct = async () => {
    if (!category) return

    try {
      const response = await fetch('http://localhost:5000/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newProduct,
          pc_id: category.pc_id,
          img_id: null
        }),
      })

      if (response.status === 200) {
        setIsAddingProduct(false)
        setNewProduct({ prod_name: '', prod_cost: 0, prod_msrp: 0, prod_time: '' })
        toast({
          title: "Success",
          description: "Product added successfully",
        })
        window.location.reload()
      } else {
        throw new Error('Failed to add product')
      }
    } catch (error) {
      console.error('Error adding product:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add product. Please try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6 flex justify-between items-center">
        <div className="flex items-center">
          <Button variant="ghost" className="mr-2 text-gray-800" onClick={() => router.push('/products')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold text-gray-800">{decodedCategory}</h1>
        </div>
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-600" />
            <Input
              type="text"
              placeholder="Search products..."
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
          <Button variant="default" onClick={() => setIsAddingProduct(true)}>Add Product</Button>
        </div>
      </div>
      {isAddingProduct && (
        <div className="mb-6 p-4 border rounded-lg bg-white">
          <h2 className="text-xl font-bold mb-4 text-gray-800">Add New Product</h2>
          <div className="grid gap-4">
            <div>
              <Label htmlFor="prod_name" className="text-gray-700">Name</Label>
              <Input
                id="prod_name"
                value={newProduct.prod_name}
                onChange={(e) => setNewProduct(prev => ({ ...prev, prod_name: e.target.value }))}
                required
                className="bg-white text-gray-800 border-gray-300"
              />
            </div>
            <div>
              <Label htmlFor="prod_cost" className="text-gray-700">Cost</Label>
              <Input
                id="prod_cost"
                type="number"
                value={newProduct.prod_cost}
                onChange={(e) => setNewProduct(prev => ({ ...prev, prod_cost: parseFloat(e.target.value) }))}
                required
                className="bg-white text-gray-800 border-gray-300"
              />
            </div>
            <div>
              <Label htmlFor="prod_msrp" className="text-gray-700">MSRP</Label>
              <Input
                id="prod_msrp"
                type="number"
                value={newProduct.prod_msrp}
                onChange={(e) => setNewProduct(prev => ({ ...prev, prod_msrp: parseFloat(e.target.value) }))}
                required
                className="bg-white text-gray-800 border-gray-300"
              />
            </div>
            <div>
              <Label htmlFor="prod_time" className="text-gray-700">Time</Label>
              <Input
                id="prod_time"
                value={newProduct.prod_time}
                onChange={(e) => setNewProduct(prev => ({ ...prev, prod_time: e.target.value }))}
                required
                className="bg-white text-gray-800 border-gray-300"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end space-x-2">
            <Button 
              variant="secondary" 
              onClick={() => setIsAddingProduct(false)}
              className="bg-gray-200 text-gray-800 hover:bg-gray-300"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAddProduct}
              className="bg-[#464B95] hover:bg-[#363875] text-white"
            >
              Add Product
            </Button>
          </div>
        </div>
      )}
      {error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : isLoading ? (
        <div className="text-center py-8 text-gray-800">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800 mx-auto mb-4"></div>
          Loading products... {retryCount > 0 && `(Retry attempt ${retryCount}/3)`}
        </div>
      ) : products.length === 0 ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Products Found</AlertTitle>
          <AlertDescription>There are no products available for this category.</AlertDescription>
        </Alert>
      ) : filteredProducts.length === 0 ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Results</AlertTitle>
          <AlertDescription>No products match your search criteria. Try adjusting your search term.</AlertDescription>
        </Alert>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-x-auto flex-1 border border-gray-300">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-300">
                <th className="p-2 text-gray-800 text-left font-semibold">Name</th>
                <th className="p-2 text-gray-800 text-left font-semibold">Quick Add</th>
                <th className="p-2 text-gray-800 text-left font-semibold">Inv/Goal</th>
                <th className="p-2 text-gray-800 text-right font-semibold">P.Rev</th>
                <th className="p-2 text-gray-800 text-right font-semibold">MSRP</th>
              </tr>
            </thead>
            <tbody>
              {sortedProducts.map((product) => {
                const productVariations = groupedVariations[product.prod_id] || []
                const isExpanded = expandedProducts.has(product.prod_id)
                const totalInv = productVariations.reduce((sum, v) => sum + v.var_inv, 0)
                const totalGoal = productVariations.reduce((sum, v) => sum + v.var_goal, 0)
                const hasMultipleVariations = productVariations.length > 1
                const singleVariation = !hasMultipleVariations && productVariations[0]

                return (
                  <Fragment key={product.prod_id}>
                    <tr 
                      className={`border-b border-gray-300 ${hasMultipleVariations ? 'bg-gray-50 cursor-pointer hover:bg-gray-100' : ''}`}
                      onClick={() => hasMultipleVariations && toggleProduct(product.prod_id)}
                    >
                      <td className="p-2 text-gray-800">
                        <div className="flex items-center">
                          {hasMultipleVariations && (
                            isExpanded ? (
                              <ChevronDown className="h-4 w-4 mr-2 text-gray-600" />
                            ) : (
                              <ChevronRight className="h-4 w-4 mr-2 text-gray-600" />
                            )
                          )}
                          <Link 
                            href={`/products/${encodeURIComponent(decodedCategory)}/${product.prod_id}`}
                            className="hover:underline"
                          >
                            <span className="font-medium">{product.prod_name}</span>
                          </Link>
                        </div>
                      </td>
                      <td className="p-2 text-gray-800">
                        {singleVariation && (
                          editingInventory[singleVariation.var_id] !== undefined ? (
                            <div className="flex items-center space-x-2">
                              <Input
                                type="number"
                                value={editingInventory[singleVariation.var_id]}
                                onChange={(e) => setEditingInventory(prev => ({ ...prev, [singleVariation.var_id]: e.target.value }))}
                                className="w-20 bg-white text-gray-800 border-gray-300"
                              />
                              <Button size="sm" variant="ghost" onClick={() => handleUpdateInventory(singleVariation.var_id)}>
                                <Check className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleCancelEdit(singleVariation.var_id)}>
                                <X className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          ) : (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => handleEditInventory(singleVariation.var_id, singleVariation.var_inv)}
                              className="border-gray-800"
                            >
                              Edit
                            </Button>
                          )
                        )}
                      </td>
                      <td className="p-2 text-gray-800">{totalInv}/{totalGoal}</td>
                      <td className="p-2 text-gray-800 text-right">{formatCurrency(product.prod_cost)}</td>
                      <td className="p-2 text-gray-800 text-right">{formatCurrency(product.prod_msrp)}</td>
                    </tr>
                    {hasMultipleVariations && isExpanded && productVariations.map((variation) => (
                      <tr key={variation.var_id} className="border-b border-gray-300 last:border-b-0 bg-white">
                        <td className="p-2 pl-8 text-gray-800">{variation.var_name}</td>
                        <td className="p-2 text-gray-800">
                          {editingInventory[variation.var_id] !== undefined ? (
                            <div className="flex items-center space-x-2">
                              <Input
                                type="number"
                                value={editingInventory[variation.var_id]}
                                onChange={(e) => setEditingInventory(prev => ({ ...prev, [variation.var_id]: e.target.value }))}
                                className="w-20 bg-white text-gray-800 border-gray-300"
                              />
                              <Button size="sm" variant="ghost" onClick={() => handleUpdateInventory(variation.var_id)}>
                                <Check className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleCancelEdit(variation.var_id)}>
                                <X className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          ) : (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => handleEditInventory(variation.var_id, variation.var_inv)}
                              className="border-gray-800"
                            >
                              Edit
                            </Button>
                          )}
                        </td>
                        <td className="p-2 text-gray-800">{variation.var_inv}/{variation.var_goal}</td>
                        <td className="p-2 text-gray-800 text-right">-</td>
                        <td className="p-2 text-gray-800 text-right">-</td>
                      </tr>
                    ))}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}