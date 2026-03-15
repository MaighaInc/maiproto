module.exports = (err, req, res, next) => {
  // Prisma known request errors
  if (err.code === 'P2002') {
    const field = err.meta?.target?.join(', ') || 'field'
    return res.status(409).json({ message: `Duplicate value: ${field} already exists` })
  }
  if (err.code === 'P2025') {
    return res.status(404).json({ message: 'Record not found' })
  }

  console.error(err)
  res.status(500).json({ message: err.message || 'Internal Server Error' })
}
