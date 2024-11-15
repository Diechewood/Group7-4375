'use client'

import { useState, useEffect, useCallback, Fragment } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, ArrowLeft, ArrowUpDown, AlertCircle, ChevronDown, ChevronRight, Check, X, Pencil, Trash2, Loader2 } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import Link from 'next/link'
import { useToast } from "@/hooks/use-toast"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
  const [editingInventory, setEditingInventory] = useState<{ [key: number]: { inv: string, goal: string } }>({})
  const [isAddingProduct, setIsAddingProduct] = useState(false)
  const [isAddingProductLoading, setIsAddingProductLoading] = useState(false)
  const [newProduct, setNewProduct] = useState<NewProduct>({
    prod_name: '',
    prod_cost: 0,
    prod_msrp: 0,
    prod_time: ''
  })
  const [isEditMode, setIsEditMode] = useState(false)
  const [editedProducts, setEditedProducts] = useState<{[key: number]: Product}>({})
  const [editedVariations, setEditedVariations] = useState<{[key: number]: ProductVariation}>({})
  const [productToDelete, setProductToDelete] = useState<Product | null>(null)

  const decodedCategory = decodeURIComponent(params.category as string)

  const fetchData = useCallback(async (signal?: AbortSignal) => {
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

  const handleEditInventory = (variationId: number, currentInventory: number, currentGoal: number) => {
    setEditingInventory(prev => ({ 
      ...prev, 
      [variationId]: { inv: currentInventory.toString(), goal: currentGoal.toString() }
    }))
  }

  const handleCancelEdit = (variationId: number) => {
    setEditingInventory(prev => {
      const next = { ...prev }
      delete next[variationId]
      return next
    })
  }

  const handleUpdateInventory = async (variationId: number) => {
    const newInventory = parseFloat(editingInventory[variationId].inv)
    const newGoal = parseFloat(editingInventory[variationId].goal)
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

      if (!response.ok) throw new Error('Failed to update inventory and goal')

      setVariations(prev =>
        prev.map(v =>
          v.var_id === variationId ? { ...v, var_inv: newInventory, var_goal: newGoal } : v
        )
      )

      handleCancelEdit(variationId)
      toast({
        title: "Success",
        description: "Inventory and goal updated successfully",
      })
    } catch (error) {
      console.error('Error updating inventory and goal:', error)
      toast({
        title: "Error",
        description: "Failed to update inventory and goal. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleAddProduct = async () => {
    if (!category) return;

    setIsAddingProductLoading(true);
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
      });

      if (response.status === 201) {
        setIsAddingProduct(false);
        toast({
          title: "Success",
          description: "Product added successfully. Refreshing page...",
        });
        // Reload the page after a short delay
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        throw new Error('Failed to add product');
      }
    } catch (error) {
      console.error('Error adding product:', error);
      toast({
        title: "Error",
        description: "Failed to add product. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAddingProductLoading(false);
    }
  };

  const handleStartEdit = () => {
    setIsEditMode(true)
    const productsMap = products.reduce((acc, product) => {
      acc[product.prod_id] = { ...product }
      return acc
    }, {} as {[key: number]: Product})
    setEditedProducts(productsMap)

    const variationsMap = variations.reduce((acc, variation) => {
      acc[variation.var_id] = { ...variation }
      return acc
    }, {} as {[key: number]: ProductVariation})
    setEditedVariations(variationsMap)
  }

  const handleCancelEditMode = () => {
    setIsEditMode(false)
    setEditedProducts({})
    setEditedVariations({})
  }

  const handleSaveEdit = async () => {
    setIsLoading(true);
    try {
      const updates = [];

      // Prepare product updates
      for (const [productId, product] of Object.entries(editedProducts)) {
        if (products.find(p => p.prod_id === parseInt(productId))?.prod_name !== product.prod_name ||
            products.find(p => p.prod_id === parseInt(productId))?.prod_cost !== product.prod_cost ||
            products.find(p => p.prod_id === parseInt(productId))?.prod_msrp !== product.prod_msrp) {
          updates.push(
            fetch(`http://localhost:5000/api/products/${productId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                prod_name: product.prod_name,
                prod_cost: product.prod_cost,
                prod_msrp: product.prod_msrp
              })
            })
          );
        }
      }

      // Prepare variation updates
      for (const [variationId, variation] of Object.entries(editedVariations)) {
        const originalVariation = variations.find(v => v.var_id === parseInt(variationId));
        if (originalVariation?.var_name !== variation.var_name ||
            originalVariation?.var_inv !== variation.var_inv ||
            originalVariation?.var_goal !== variation.var_goal) {
          updates.push(
            fetch(`http://localhost:5000/api/productvariations/${variationId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                var_name: variation.var_name,
                var_inv: variation.var_inv,
                var_goal: variation.var_goal
              })
            })
          );
        }
      }

      // Execute all updates
      const results = await Promise.all(updates);

      // Check if all updates were successful
      if (results.every(res => res.ok)) {
        toast({
          title: "Success",
          description: "Changes saved successfully",
        });
        setIsEditMode(false);
        setEditedProducts({});
        setEditedVariations({});
        await fetchData(new AbortController().signal);
      } else {
        throw new Error('Some updates failed');
      }
    } catch (error) {
      console.error('Error saving changes:', error);
      toast({
        title: "Error",
        description: "Failed to save changes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleProductEdit = (productId: number, field: keyof Product, value: string | number) => {
    setEditedProducts(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [field]: value
      }
    }))
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

  const handleDeleteProduct = async (product: Product) => {
    setProductToDelete(product);
  };

  const confirmDelete = async () => {
    if (!productToDelete) return;

    try {
      const response = await fetch(`http://localhost:5000/api/products/${productToDelete.prod_id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete product');
      }

      setProducts(prev => prev.filter(p => p.prod_id !== productToDelete.prod_id));
      setVariations(prev => prev.filter(v => v.prod_id !== productToDelete.prod_id));
      setProductToDelete(null);

      toast({
        title: "Success",
        description: "Product and its variations deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting product:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete product. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6">
        <Button variant="ghost" className="mb-2 text-gray-800" onClick={() => router.push('/products')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-3xl font-bold text-gray-800 mb-4">{decodedCategory}</h1>
        <div className="flex justify-end items-center space-x-2">
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
            <Button 
              variant="outline" 
              onClick={handleStartEdit}
              className="text-gray-800 border-gray-300"
            >
              <Pencil className="h-4 w-4 mr-2" />
              Edit Values
            </Button>
          )}
          <Button variant="default" onClick={() => setIsAddingProduct(true)}>Add Product</Button>
        </div>
      </div>
      <Dialog open={isAddingProduct} onOpenChange={setIsAddingProduct}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Product</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="prod_name">Name</Label>
              <Input
                id="prod_name"
                value={newProduct.prod_name}
                onChange={(e) => setNewProduct(prev => ({ ...prev, prod_name: e.target.value }))}
                className="col-span-3"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="prod_cost">Cost</Label>
              <Input
                id="prod_cost"
                type="number"
                value={newProduct.prod_cost}
                onChange={(e) => setNewProduct(prev => ({ ...prev, prod_cost: parseFloat(e.target.value) }))}
                className="col-span-3"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="prod_msrp">MSRP</Label>
              <Input
                id="prod_msrp"
                type="number"
                value={newProduct.prod_msrp}
                onChange={(e) => setNewProduct(prev => ({ ...prev, prod_msrp: parseFloat(e.target.value) }))}
                className="col-span-3"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="prod_time">Time</Label>
              <Input
                id="prod_time"
                value={newProduct.prod_time}
                onChange={(e) => setNewProduct(prev => ({ ...prev, prod_time: e.target.value }))}
                className="col-span-3"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsAddingProduct(false)} disabled={isAddingProductLoading}>Cancel</Button>
            <Button onClick={handleAddProduct} disabled={isAddingProductLoading}>
              {isAddingProductLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Product'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!productToDelete} onOpenChange={(open) => !open && setProductToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {productToDelete?.prod_name} and all its variations.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
                <th className="p-2 text-gray-800 text-left font-semibold">Inv</th>
                <th className="p-2 text-gray-800 text-left font-semibold">Goal</th>
                <th className="p-2 text-gray-800 text-right font-semibold">P.Rev</th>
                <th className="p-2 text-gray-800 text-right font-semibold">MSRP</th>
                <th className="p-2 text-gray-800 text-right font-semibold">Actions</th>
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
                const editedProduct = editedProducts[product.prod_id] || product

                return (
                  <Fragment key={product.prod_id}>
                    <tr 
                      className={`border-b border-gray-300 ${hasMultipleVariations ? 'bg-gray-50 hover:bg-gray-100' : ''}`}
                    >
                      <td className="p-2 text-gray-800">
                        <div className="flex items-center">
                          {hasMultipleVariations && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="mr-2"
                              onClick={() => toggleProduct(product.prod_id)}
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-gray-600" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-gray-600" />
                              )}
                            </Button>
                          )}
                          {isEditMode ? (
                            <Input
                              value={editedProduct.prod_name}
                              onChange={(e) => handleProductEdit(product.prod_id, 'prod_name', e.target.value)}
                              className="w-full max-w-[200px]"
                            />
                          ) : (
                            <Link 
                              href={`/products/${encodeURIComponent(decodedCategory)}/${product.prod_id}`}
                              className="hover:underline"
                            >
                              <span className="font-medium">{product.prod_name}</span>
                            </Link>
                          )}
                        </div>
                      </td>
                      <td className="p-2 text-gray-800">
                        {singleVariation && (
                          editingInventory[singleVariation.var_id] !== undefined ? (
                            <div className="flex items-center space-x-2">
                              <Input
                                type="number"
                                value={editingInventory[singleVariation.var_id].inv}
                                onChange={(e) => setEditingInventory(prev => ({ 
                                  ...prev, 
                                  [singleVariation.var_id]: { ...prev[singleVariation.var_id], inv: e.target.value }
                                }))}
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
                              onClick={() => handleEditInventory(singleVariation.var_id, singleVariation.var_inv, singleVariation.var_goal)}
                              className="border-gray-800"
                            >
                              Edit
                            </Button>
                          )
                        )}
                      </td>
                      <td className="p-2 text-gray-800">
                        {isEditMode && singleVariation ? (
                          <Input
                            type="number"
                            value={editedVariations[singleVariation.var_id]?.var_inv || singleVariation.var_inv}
                            onChange={(e) => handleVariationEdit(singleVariation.var_id, 'var_inv', parseInt(e.target.value))}
                            className="w-20"
                          />
                        ) : (
                          totalInv
                        )}
                      </td>
                      <td className="p-2 text-gray-800">
                        {isEditMode && singleVariation ? (
                          <Input
                            type="number"
                            value={editedVariations[singleVariation.var_id]?.var_goal || singleVariation.var_goal}
                            onChange={(e) => handleVariationEdit(singleVariation.var_id, 'var_goal', parseInt(e.target.value))}
                            className="w-20"
                          />
                        ) : (
                          totalGoal
                        )}
                      </td>
                      <td className="p-2 text-gray-800 text-right">
                        {isEditMode ? (
                          <Input
                            type="number"
                            value={editedProduct.prod_cost}
                            onChange={(e) => handleProductEdit(product.prod_id, 'prod_cost', parseFloat(e.target.value))}
                            className="w-24 ml-auto"
                          />
                        ) : (
                          formatCurrency(product.prod_cost)
                        )}
                      </td>
                      <td className="p-2 text-gray-800 text-right">
                        {isEditMode ? (
                          <Input
                            type="number"
                            value={editedProduct.prod_msrp}
                            onChange={(e) => handleProductEdit(product.prod_id, 'prod_msrp', parseFloat(e.target.value))}
                            className="w-24 ml-auto"
                          />
                        ) : (
                          formatCurrency(product.prod_msrp)
                        )}
                      </td>
                      <td className="p-2 text-gray-800 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteProduct(product)
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                    {hasMultipleVariations && isExpanded && productVariations.map((variation) => {
                      const editedVariation = editedVariations[variation.var_id] || variation
                      return (
                        <tr key={variation.var_id} className="border-b border-gray-300 last:border-b-0 bg-white">
                          <td className="p-2 pl-8 text-gray-800">
                            {isEditMode ? (
                              <Input
                                value={editedVariation.var_name}
                                onChange={(e) => handleVariationEdit(variation.var_id, 'var_name', e.target.value)}
                                className="w-full max-w-[200px]"
                              />
                            ) : (
                              variation.var_name
                            )}
                          </td>
                          <td className="p-2 text-gray-800">
                            {editingInventory[variation.var_id] !== undefined ? (
                              <div className="flex items-center space-x-2">
                                <Input
                                  type="number"
                                  value={editingInventory[variation.var_id].inv}
                                  onChange={(e) => setEditingInventory(prev => ({ 
                                    ...prev, 
                                    [variation.var_id]: { ...prev[variation.var_id], inv: e.target.value }
                                  }))}
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
                                onClick={() => handleEditInventory(variation.var_id, variation.var_inv, variation.var_goal)}
                                className="border-gray-800"
                              >
                                Edit
                              </Button>
                            )}
                          </td>
                          <td className="p-2 text-gray-800">
                            {isEditMode ? (
                              <Input
                                type="number"
                                value={editedVariation.var_inv}
                                onChange={(e) => handleVariationEdit(variation.var_id, 'var_inv', parseInt(e.target.value))}
                                className="w-20"
                              />
                            ) : (
                              variation.var_inv
                            )}
                          </td>
                          <td className="p-2 text-gray-800">
                            {isEditMode ? (
                              <Input
                                type="number"
                                value={editedVariation.var_goal}
                                onChange={(e) => handleVariationEdit(variation.var_id, 'var_goal', parseInt(e.target.value))}
                                className="w-20"
                              />
                            ) : (
                              variation.var_goal
                            )}
                          </td>
                          <td className="p-2 text-gray-800 text-right">-</td>
                          <td className="p-2 text-gray-800 text-right">-</td>
                          <td className="p-2 text-gray-800 text-right">-</td>
                        </tr>
                      )
                    })}
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