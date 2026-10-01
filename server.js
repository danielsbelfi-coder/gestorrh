require("dotenv").config();
const { app } = require("./src/app.js")

const PORT = process.env.PORT || 3000;

const iniciarServidor = () => {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`)
    })
}

iniciarServidor()
