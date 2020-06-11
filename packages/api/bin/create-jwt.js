/* eslint-disable @typescript-eslint/no-var-requires */

if (!process.env.JWT_SECRET) throw new Error('Missing JWT_SECRET env')
if (!process.argv[2]) throw new Error('Failed to provide a name')
if (!process.argv.length > 3) throw new Error('Too many arguments')

const jwt = require('jsonwebtoken')
console.log(jwt.sign({name: process.argv[2]}, process.env.JWT_SECRET))
