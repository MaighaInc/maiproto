const prisma = require("../prismaClient")

exports.createUser = async (data) => {
  return prisma.user.create({
    data
  })
}

exports.getUsers = async () => {
  return prisma.user.findMany()
}

exports.getUser = async (id) => {
  return prisma.user.findUnique({
    where: { id: Number(id) }
  })
}

exports.updateUser = async (id, data) => {
  return prisma.user.update({
    where: { id: Number(id) },
    data
  })
}

exports.deleteUser = async (id) => {
  return prisma.user.delete({
    where: { id: Number(id) }
  })
}
