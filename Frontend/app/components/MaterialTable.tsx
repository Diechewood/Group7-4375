import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface Material {
  mat_id: number
  mat_name: string
  mat_sku: string
  mat_inv: number
  mat_alert: number
}

interface MaterialTableProps {
  materials: Material[]
}

export default function MaterialTable({ materials }: MaterialTableProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-5 gap-4 font-bold text-sm text-gray-700 px-4">
        <div>Name</div>
        <div>SKU</div>
        <div>Inventory</div>
        <div>Alert Level</div>
        <div>Actions</div>
      </div>
      {materials.map((material) => (
        <Card key={material.mat_id}>
          <CardContent className="p-4">
            <div className="grid grid-cols-5 gap-4 items-center">
              <div>{material.mat_name}</div>
              <div>{material.mat_sku}</div>
              <div>{material.mat_inv}</div>
              <div>{material.mat_alert}</div>
              <div>
                <Button variant="outline" size="sm">Edit</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}