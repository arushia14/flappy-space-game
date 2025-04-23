import FlappySpace from "@/components/flappy-space"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-black">
      <h1 className="text-4xl font-bold text-white mb-4 pixel-font">FLAPPY SPACE</h1>
      <div className="w-full max-w-md">
        <FlappySpace />
      </div>
    </main>
  )
}
