require('dotenv').config();
const app=require('./src/app');
const { checkOverdueInvoices }=require('./src/business-os');
const port=Number(process.env.PORT)||3000;
app.listen(port,()=>console.log(`Greece Business Platform running at http://localhost:${port}`));
checkOverdueInvoices().catch(()=>{});
setInterval(()=>checkOverdueInvoices().catch(()=>{}),6*60*60*1000).unref();
