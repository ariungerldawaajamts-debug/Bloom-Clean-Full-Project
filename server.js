const express=require("express");
const axios=require("axios");
const cors=require("cors");

const app=express();
app.use(cors({origin:true,credentials:true}));
app.use(express.json());
app.use(express.static(__dirname));

const QPAY={
  baseUrl:process.env.QPAY_BASE_URL||"https://merchant.qpay.mn/v2",
  username:process.env.QPAY_USERNAME||"YOUR_QPAY_USERNAME",
  password:process.env.QPAY_PASSWORD||"YOUR_QPAY_PASSWORD",
  invoiceCode:process.env.QPAY_INVOICE_CODE||"YOUR_INVOICE_CODE",
  callbackUrl:process.env.QPAY_CALLBACK_URL||"https://YOUR-DOMAIN/api/qpay/webhook"
};

let token="";
let tokenExpiresAt=0;

function configured(){
  return QPAY.username&&!QPAY.username.startsWith("YOUR_")&&
         QPAY.password&&!QPAY.password.startsWith("YOUR_")&&
         QPAY.invoiceCode&&!QPAY.invoiceCode.startsWith("YOUR_");
}

async function auth(){
  if(!configured()) throw new Error("QPay credentials тохируулагдаагүй байна.");
  if(!token||Date.now()>=tokenExpiresAt){
    const r=await axios.post(`${QPAY.baseUrl}/auth/token`,{},{
      auth:{username:QPAY.username,password:QPAY.password},timeout:15000
    });
    token=r.data.access_token;
    tokenExpiresAt=Date.now()+Math.max(60,Number(r.data.expires_in||1800)-60)*1000;
  }
  return {Authorization:`Bearer ${token}`};
}

function qpayError(error){
  return error.response?.data?.message||error.response?.data||error.message||"QPay хүсэлт амжилтгүй боллоо.";
}

app.post("/api/qpay/create-invoice",async(req,res)=>{
  try{
    const {orderId,amount,orderName}=req.body||{};
    const numericAmount=Number(amount);
    if(!orderId||!Number.isFinite(numericAmount)||numericAmount<=0){
      return res.status(400).json({success:false,message:"Захиалгын дугаар болон зөв дүн шаардлагатай."});
    }
    const headers=await auth();
    const payload={
      invoice_code:QPAY.invoiceCode,
      sender_invoice_no:String(orderId),
      invoice_receiver_code:"terminal",
      invoice_description:`Bloom & Coffee: ${orderName||"Order"}`,
      amount:numericAmount,
      callback_url:`${QPAY.callbackUrl}?order_id=${encodeURIComponent(orderId)}`
    };
    const r=await axios.post(`${QPAY.baseUrl}/invoice`,payload,{headers,timeout:15000});
    res.json({
      success:true,
      qpayInvoiceId:r.data.invoice_id,
      qrImage:r.data.qr_image||null,
      qrText:r.data.qr_text||null,
      urls:r.data.urls||[]
    });
  }catch(error){
    res.status(error.response?.status===401?502:500).json({success:false,message:qpayError(error)});
  }
});

app.post("/api/qpay/check-payment",async(req,res)=>{
  try{
    const {qpayInvoiceId}=req.body||{};
    if(!qpayInvoiceId) return res.status(400).json({success:false,message:"qpayInvoiceId шаардлагатай."});
    const headers=await auth();
    const r=await axios.post(`${QPAY.baseUrl}/payment/check`,
      {object_type:"INVOICE",object_id:qpayInvoiceId},
      {headers,timeout:15000});
    const rows=r.data.rows||[];
    const paid=rows.some(row=>row.payment_status==="PAID");
    res.json({paid,paymentInfo:paid?rows.find(row=>row.payment_status==="PAID"):null});
  }catch(error){
    res.status(error.response?.status===401?502:500).json({success:false,message:qpayError(error)});
  }
});

app.post("/api/qpay/webhook",(req,res)=>{
  console.log("QPay webhook",req.query,req.body);
  res.json({success:true});
});

app.get("/api/health",(req,res)=>res.json({ok:true,service:"Bloom"}));

app.use((error,req,res,next)=>{
  if(error instanceof SyntaxError&&error.status===400){
    return res.status(400).json({success:false,message:"JSON өгөгдөл буруу байна."});
  }
  console.error("Bloom server error",error);
  return res.status(500).json({success:false,message:"Серверийн алдаа гарлаа."});
});

const PORT=process.env.PORT||5000;
app.listen(PORT,()=>console.log(`Bloom server: http://localhost:${PORT}`));
