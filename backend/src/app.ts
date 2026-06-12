import cors from 'cors'
import express from 'express'
import helmet from 'helmet'

export const app = express()

app.use(helmet())
app.use(cors(corsOptions))
