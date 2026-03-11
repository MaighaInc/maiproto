const userService = require("../services/userService")

exports.createUser = async (req, res, next) => {
  try {
    const user = await userService.createUser(req.body)
    res.json(user)
  } catch (err) {
    next(err)
  }
}

exports.getUsers = async (req, res, next) => {
  try {
    const users = await userService.getUsers()
    res.json(users)
  } catch (err) {
    next(err)
  }
}

exports.getUser = async (req, res, next) => {
  try {
    const user = await userService.getUser(req.params.id)
    res.json(user)
  } catch (err) {
    next(err)
  }
}

exports.updateUser = async (req, res, next) => {
  try {
    const user = await userService.updateUser(req.params.id, req.body)
    res.json(user)
  } catch (err) {
    next(err)
  }
}

exports.deleteUser = async (req, res, next) => {
  try {
    const user = await userService.deleteUser(req.params.id)
    res.json(user)
  } catch (err) {
    next(err)
  }
}
