const express = require("express")
const { planes } = require("./cuenta.controller")

const router = express.Router()

router.get("/", planes)

module.exports = router