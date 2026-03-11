require("dotenv").config()

const express = require("express")
const userRoutes = require("./routes/userRoutes")
const errorHandler = require("./middleware/errorHandler")

const app = express()

app.use(express.json())

app.use("/api/users", userRoutes)

app.use(errorHandler)

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
