import { Card, CardContent } from "@/components/ui/card"
import Link from 'next/link'

interface CategoryCardProps {
  id: number
  name: string
}

export default function CategoryCard({ id, name }: CategoryCardProps) {
  return (
    <Link href={`/categories/${encodeURIComponent(name)}`}>
      <Card className="hover:shadow-md transition-shadow bg-white">
        <CardContent className="p-4">
          <h3 className="font-semibold text-gray-800">{name}</h3>
        </CardContent>
      </Card>
    </Link>
  )
}