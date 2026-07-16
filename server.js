require('dotenv').config();
const app=require('./src/app');
const port=Number(process.env.PORT)||3000;
app.listen(port,()=>console.log(`Greece Business Platform running at http://localhost:${port}`));
