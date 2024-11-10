'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

interface ProductVariation {
  var_id: number
  var_name: string
  var_inv: number
  var_goal: number
  prod_id: number
}

interface Product {
  prod_id: number
  prod_name: string
  pc_name: string
}

interface Material {
  mat_name: string
  mat_inv: number
  mat_alert: number
  mc_name: string
}

export default function DashboardPage() {
  const [productAlerts, setProductAlerts] = useState<(ProductVariation & Partial<Product>)[]>([])
  const [materialAlerts, setMaterialAlerts] = useState<Material[]>([])

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        // Fetch all product variations
        const productVariationsRes = await fetch('http://localhost:5000/api/productvariations')
        const productVariations: ProductVariation[] = await productVariationsRes.json()

        // Filter product variations with low inventory
        const lowInventoryProducts = productVariations.filter(item => item.var_inv < item.var_goal)

        // Fetch all products in a single query
        const productsRes = await fetch('http://localhost:5000/api/products')
        const products: Product[] = await productsRes.json()

        // Create a map of products for quick lookup
        const productMap = new Map(products.map(product => [product.prod_id, product]))

        // Combine product variations with their corresponding product details
        const enhancedProductData = lowInventoryProducts.map(variation => ({
          ...variation,
          ...productMap.get(variation.prod_id)
        }))

        setProductAlerts(enhancedProductData)

        // Fetch materials with low inventory
        const materialRes = await fetch('http://localhost:5000/api/materials')
        const materialData: Material[] = await materialRes.json()
        const lowInventoryMaterials = materialData.filter(item => item.mat_inv < item.mat_alert)

        setMaterialAlerts(lowInventoryMaterials)
      } catch (error) {
        console.error('Error fetching alerts:', error)
      }
    }

    fetchAlerts()
  }, [])

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-black text-3xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Product Variation Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[calc(100vh-250px)]">
              {productAlerts.map((item) => (
                <Alert key={item.var_id} variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Low Inventory</AlertTitle>
                  <AlertDescription>
                    <p><strong>{item.var_name}</strong></p>
                    <p>Product: {item.prod_name}</p>
                    <p>Category: {item.pc_name}</p>
                    <p>Current: {item.var_inv}</p>
                    <p>Goal: {item.var_goal}</p>
                  </AlertDescription>
                </Alert>
              ))}
              {productAlerts.length === 0 && <p>No product variation alerts</p>}
            </ScrollArea>
          </CardContent>
        </Card>
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Material Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[calc(100vh-250px)]">
              {materialAlerts.map((item) => (
                <Alert key={item.mat_name} variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Low Inventory</AlertTitle>
                  <AlertDescription>
                    <p><strong>{item.mat_name}</strong></p>
                    <p>Category: {item.mc_name}</p>
                    <p>Current: {item.mat_inv}</p>
                    <p>Alert Threshold: {item.mat_alert}</p>
                  </AlertDescription>
                </Alert>
              ))}
              {materialAlerts.length === 0 && <p>No material alerts</p>}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}