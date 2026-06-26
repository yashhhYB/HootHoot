import { getCurrentUser } from "@/lib/auth-core"
import { redirect } from "next/navigation"

export default async function AuthLayout({
   children,
}: Readonly<{
   children: React.ReactNode;
}>) {
   const user = await getCurrentUser().catch(() => null)
   if (user) {
      redirect("/")
   }
   return (
      <main className="relative h-screen">
      <video
        autoPlay
        loop
        muted
        playsInline
        preload="none"
        className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none gpu-accelerated"
        src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260330_145725_08886141-ed95-4a8e-8d6d-b75eaadce638.mp4"
      />
         <div className="relative h-full flex flex-col items-center justify-center">
            {children}
         </div>
      </main>
   );
}
