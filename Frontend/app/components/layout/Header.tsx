import Link from 'next/link'
import Image from 'next/image'
import { Bell, Star, HelpCircle, Menu } from 'lucide-react'
import { Button } from "@/components/ui/button"

export default function Header() {
  return (
    <header className="bg-[#4A4A7C] text-white p-4 flex justify-between items-center z-50 fixed top-0 left-0 right-0 h-16">
      <div className="flex items-center">
        <Button variant="ghost" size="icon" className="mr-2 md:hidden text-white hover:text-purple-200">
          <Menu />
        </Button>
        <Link href="/dashboard" className="flex items-center">
          <Image src="/placeholder.svg" alt="Frosted Fabrics Logo" width={32} height={32} className="mr-2" />
          <h1 className="text-xl font-bold text-white">Frosted Fabrics</h1>
        </Link>
      </div>
    </header>
  )
}