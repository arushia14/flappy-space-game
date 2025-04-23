"use client"

import { useEffect, useRef, useState } from "react"
import { useToast } from "@/hooks/use-toast"

// Game constants
const GRAVITY = 0.5
const JUMP_FORCE = -8
const OBSTACLE_SPEED = 3
const OBSTACLE_FREQUENCY = 1500
const OBSTACLE_GAP = 150
const SPACESHIP_WIDTH = 40
const SPACESHIP_HEIGHT = 24
const OBSTACLE_WIDTH = 60

type Obstacle = {
  x: number
  topHeight: number
  passed: boolean
  type: "meteor" | "planet"
}

type GameState = "idle" | "playing" | "gameover"

export default function FlappySpace() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [gameState, setGameState] = useState<GameState>("idle")
  const [score, setScore] = useState(0)
  const [highScore, setHighScore] = useState(0)
  const { toast } = useToast()

  // Game state refs (to avoid dependency issues in animation loop)
  const gameStateRef = useRef(gameState)
  const scoreRef = useRef(score)
  const shipRef = useRef({
    y: 200,
    velocity: 0,
  })
  const obstaclesRef = useRef<Obstacle[]>([])
  const lastObstacleTimeRef = useRef(0)
  const animationFrameRef = useRef<number>(0)

  // Load high score from localStorage on mount
  useEffect(() => {
    const savedHighScore = localStorage.getItem("flappySpaceHighScore")
    if (savedHighScore) {
      setHighScore(Number.parseInt(savedHighScore))
    }
  }, [])

  // Update gameStateRef when gameState changes
  useEffect(() => {
    gameStateRef.current = gameState
  }, [gameState])

  // Update scoreRef when score changes
  useEffect(() => {
    scoreRef.current = score
  }, [score])

  // Game initialization
  const startGame = () => {
    setGameState("playing")
    setScore(0)
    shipRef.current = {
      y: 200,
      velocity: 0,
    }
    obstaclesRef.current = []
    lastObstacleTimeRef.current = 0

    toast({
      title: "Game Started!",
      description: "Tap or press SPACE to fly your spaceship.",
    })
  }

  // Handle game over
  const gameOver = () => {
    setGameState("gameover")

    // Update high score if needed
    if (score > highScore) {
      setHighScore(score)
      localStorage.setItem("flappySpaceHighScore", score.toString())

      toast({
        title: "New High Score!",
        description: `You achieved a new high score of ${score}!`,
      })
    } else {
      toast({
        title: "Game Over!",
        description: `Your score: ${score}. High score: ${highScore}`,
      })
    }
  }

  // Make the spaceship jump
  const jump = () => {
    if (gameStateRef.current === "playing") {
      shipRef.current.velocity = JUMP_FORCE
    } else if (gameStateRef.current === "idle" || gameStateRef.current === "gameover") {
      startGame()
    }
  }

  // Handle keyboard and mouse/touch events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault()
        jump()
      }
    }

    const handleClick = () => {
      jump()
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("click", handleClick)
    window.addEventListener("touchstart", handleClick)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("click", handleClick)
      window.removeEventListener("touchstart", handleClick)
    }
  }, [])

  // Main game loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set actual canvas dimensions
    canvas.width = canvas.clientWidth
    canvas.height = canvas.clientHeight

    // Create pixel art effect
    ctx.imageSmoothingEnabled = false

    // Generate stars for background
    const stars = Array.from({ length: 100 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 2 + 1,
      opacity: Math.random() * 0.8 + 0.2,
    }))

    // Game animation loop
    const animate = (timestamp: number) => {
      // Clear canvas
      ctx.fillStyle = "#000033"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Draw stars
      stars.forEach((star) => {
        ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`
        ctx.fillRect(star.x, star.y, star.size, star.size)
      })

      if (gameStateRef.current === "playing") {
        // Update spaceship position
        shipRef.current.velocity += GRAVITY
        shipRef.current.y += shipRef.current.velocity

        // Generate new obstacles
        if (timestamp - lastObstacleTimeRef.current > OBSTACLE_FREQUENCY) {
          const topHeight = Math.random() * (canvas.height - OBSTACLE_GAP - 100) + 50
          obstaclesRef.current.push({
            x: canvas.width,
            topHeight,
            passed: false,
            type: Math.random() > 0.5 ? "meteor" : "planet",
          })
          lastObstacleTimeRef.current = timestamp
        }

        // Update and draw obstacles
        for (let i = 0; i < obstaclesRef.current.length; i++) {
          const obstacle = obstaclesRef.current[i]
          obstacle.x -= OBSTACLE_SPEED

          // Check if obstacle is passed
          if (!obstacle.passed && obstacle.x + OBSTACLE_WIDTH < canvas.width / 2 - SPACESHIP_WIDTH / 2) {
            obstacle.passed = true
            setScore((prevScore) => prevScore + 1)
          }

          // Draw top obstacle
          drawObstacle(ctx, obstacle.x, 0, OBSTACLE_WIDTH, obstacle.topHeight, obstacle.type)

          // Draw bottom obstacle
          drawObstacle(
            ctx,
            obstacle.x,
            obstacle.topHeight + OBSTACLE_GAP,
            OBSTACLE_WIDTH,
            canvas.height - (obstacle.topHeight + OBSTACLE_GAP),
            obstacle.type,
          )

          // Check collision
          if (
            // Spaceship right edge > obstacle left edge
            canvas.width / 2 + SPACESHIP_WIDTH / 2 > obstacle.x &&
            // Spaceship left edge < obstacle right edge
            canvas.width / 2 - SPACESHIP_WIDTH / 2 < obstacle.x + OBSTACLE_WIDTH &&
            // Spaceship top edge < top obstacle bottom edge
            (shipRef.current.y < obstacle.topHeight ||
              // Spaceship bottom edge > bottom obstacle top edge
              shipRef.current.y + SPACESHIP_HEIGHT > obstacle.topHeight + OBSTACLE_GAP)
          ) {
            gameOver()
          }
        }

        // Remove obstacles that are off-screen
        obstaclesRef.current = obstaclesRef.current.filter((obstacle) => obstacle.x + OBSTACLE_WIDTH > 0)

        // Check if spaceship hits the boundaries
        if (shipRef.current.y < 0 || shipRef.current.y + SPACESHIP_HEIGHT > canvas.height) {
          gameOver()
        }
      }

      // Draw spaceship
      drawSpaceship(ctx, canvas.width / 2 - SPACESHIP_WIDTH / 2, shipRef.current.y, SPACESHIP_WIDTH, SPACESHIP_HEIGHT)

      // Draw score
      ctx.fillStyle = "#ffffff"
      ctx.font = "20px 'Press Start 2P', monospace"
      ctx.textAlign = "center"
      ctx.fillText(`SCORE: ${scoreRef.current}`, canvas.width / 2, 30)

      // Draw game state messages
      if (gameStateRef.current === "idle") {
        drawMessage(ctx, canvas, "PRESS SPACE TO START", "HIGH SCORE: " + highScore)
      } else if (gameStateRef.current === "gameover") {
        drawMessage(ctx, canvas, "GAME OVER", "PRESS SPACE TO RESTART")
      }

      // Continue animation loop
      animationFrameRef.current = requestAnimationFrame(animate)
    }

    // Start animation loop
    animationFrameRef.current = requestAnimationFrame(animate)

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameRef.current)
    }
  }, [highScore])

  return (
    <div className="relative w-full">
      <canvas ref={canvasRef} className="w-full aspect-[3/4] border-4 border-white rounded-lg pixelated" />
      <style jsx global>{`
        @font-face {
          font-family: 'Press Start 2P';
          src: url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
        }
        
        .pixelated {
          image-rendering: pixelated;
        }
        
        .pixel-font {
          font-family: 'Press Start 2P', monospace;
          letter-spacing: 2px;
        }
      `}</style>
    </div>
  )
}

// Helper function to draw the spaceship
function drawSpaceship(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) {
  // Main body (silver)
  ctx.fillStyle = "#c0c0c0"
  ctx.fillRect(x + 10, y + 8, width - 20, height - 16)

  // Cockpit (blue)
  ctx.fillStyle = "#4040ff"
  ctx.fillRect(x + width - 15, y + 10, 8, 4)

  // Wings (red)
  ctx.fillStyle = "#ff4040"
  ctx.fillRect(x + 5, y + 4, 5, 16)
  ctx.fillRect(x + 5, y + 4, 25, 4)
  ctx.fillRect(x + 5, y + height - 8, 25, 4)

  // Thrusters (yellow/orange)
  ctx.fillStyle = "#ffa500"
  ctx.fillRect(x, y + 8, 5, 8)

  // Thruster flame (random to create animation effect)
  const flameLength = Math.random() * 8 + 4
  ctx.fillStyle = "#ffff00"
  ctx.fillRect(x - flameLength, y + 10, flameLength, 4)
}

// Helper function to draw obstacles (meteors and planets)
function drawObstacle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  type: "meteor" | "planet",
) {
  if (type === "meteor") {
    // Draw meteor (brown/red with craters)
    const segmentHeight = 20
    const segments = Math.ceil(height / segmentHeight)

    for (let i = 0; i < segments; i++) {
      const segY = y + i * segmentHeight
      const segHeight = Math.min(segmentHeight, y + height - segY)

      // Main meteor body
      ctx.fillStyle = "#8B4513"
      ctx.fillRect(x, segY, width, segHeight)

      // Meteor details (craters)
      ctx.fillStyle = "#A52A2A"

      // Add random craters
      const craterCount = Math.floor(Math.random() * 3) + 1
      for (let j = 0; j < craterCount; j++) {
        const craterX = x + Math.random() * (width - 10)
        const craterY = segY + Math.random() * (segHeight - 10)
        const craterSize = Math.random() * 6 + 4
        ctx.fillRect(craterX, craterY, craterSize, craterSize)
      }
    }
  } else {
    // Draw planet (with rings or features)
    const segmentHeight = 20
    const segments = Math.ceil(height / segmentHeight)

    for (let i = 0; i < segments; i++) {
      const segY = y + i * segmentHeight
      const segHeight = Math.min(segmentHeight, y + height - segY)

      // Main planet body
      ctx.fillStyle = "#4682B4" // Steel blue
      ctx.fillRect(x, segY, width, segHeight)

      // Planet rings or features
      ctx.fillStyle = "#B0C4DE" // Light steel blue

      // Add horizontal rings
      if (i % 2 === 0) {
        ctx.fillRect(x - 5, segY + segHeight / 2 - 2, width + 10, 4)
      }
    }
  }
}

// Helper function to draw game messages
function drawMessage(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  mainMessage: string,
  subMessage: string,
) {
  // Semi-transparent background
  ctx.fillStyle = "rgba(0, 0, 0, 0.7)"
  ctx.fillRect(0, canvas.height / 2 - 50, canvas.width, 100)

  // Main message
  ctx.fillStyle = "#ffffff"
  ctx.font = "16px 'Press Start 2P', monospace"
  ctx.textAlign = "center"
  ctx.fillText(mainMessage, canvas.width / 2, canvas.height / 2 - 15)

  // Sub message
  ctx.font = "12px 'Press Start 2P', monospace"
  ctx.fillText(subMessage, canvas.width / 2, canvas.height / 2 + 15)
}
